import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// ─── Helpers ────────────────────────────────────────────────

type NotificationPrefs = {
  newOffers?: boolean;
  messages?: boolean;
  reviewReminders?: boolean;
  announcements?: boolean;
  statusUpdates?: boolean;
};

async function getUserToken(uid: string): Promise<string | null> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return snap.data()?.expoPushToken ?? null;
}

async function getUserPrefs(uid: string): Promise<NotificationPrefs> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return {};
  return snap.data()?.notificationPrefs ?? {};
}

async function sendPush(
  uid: string,
  prefKey: keyof NotificationPrefs,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const [token, prefs] = await Promise.all([getUserToken(uid), getUserPrefs(uid)]);

  // Check if user has this notification type enabled (default to true)
  if (prefs[prefKey] === false) return;
  if (!token || !Expo.isExpoPushToken(token)) return;

  const message: ExpoPushMessage = {
    to: token,
    sound: "default",
    title,
    body,
    data: data ?? {},
  };

  try {
    await expo.sendPushNotificationsAsync([message]);
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
}

// ─── Cloud Functions ────────────────────────────────────────

/**
 * When a new offer is created on a post, notify the post author.
 */
export const onNewOffer = onDocumentCreated(
  "groups/{groupId}/posts/{postId}/offers/{offerId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const offer = snap.data();
    const { groupId, postId } = event.params;

    // Get the post to find the author
    const postSnap = await db.doc(`groups/${groupId}/posts/${postId}`).get();
    if (!postSnap.exists) return;
    const post = postSnap.data()!;

    const authorUid = post.authorUid;
    if (!authorUid || authorUid === offer.lenderUid) return; // don't notify self

    const lenderName = `${offer.lenderFirstName ?? ""} ${offer.lenderLastName ?? ""}`.trim() || "Someone";
    const isDawa = post.type === "dawa";

    await sendPush(
      authorUid,
      "newOffers",
      isDawa ? "New request on your donation" : "New offer on your request",
      isDawa
        ? `${lenderName} wants your item "${post.text?.slice(0, 50) ?? ""}"`
        : `${lenderName} offered to lend for "${post.text?.slice(0, 50) ?? ""}"`,
      { type: "newOffer", postId, groupId }
    );
  }
);

/**
 * When a new message is sent in a thread, notify the other participant.
 */
export const onNewMessage = onDocumentCreated(
  "groups/{groupId}/threads/{threadId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data();
    const { groupId, threadId } = event.params;
    const senderUid = message.senderUid;

    // Get thread to find the other participant
    const threadSnap = await db.doc(`groups/${groupId}/threads/${threadId}`).get();
    if (!threadSnap.exists) return;
    const thread = threadSnap.data()!;

    const recipientUid =
      senderUid === thread.borrowerUid ? thread.lenderUid : thread.borrowerUid;
    if (!recipientUid) return;

    // Get sender name
    const senderSnap = await db.doc(`groups/${groupId}/members/${senderUid}`).get();
    const senderName = senderSnap.exists
      ? `${senderSnap.data()?.firstName ?? ""} ${senderSnap.data()?.lastName ?? ""}`.trim()
      : "Someone";

    const preview = (message.text ?? "").slice(0, 80);

    await sendPush(
      recipientUid,
      "messages",
      senderName,
      preview,
      { type: "message", threadId, groupId }
    );
  }
);

/**
 * When an announcement is created, notify all group members.
 */
export const onAnnouncementCreated = onDocumentCreated(
  "groups/{groupId}/announcements/{announcementId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const announcement = snap.data();
    const { groupId } = event.params;

    // Get group name
    const groupSnap = await db.doc(`groups/${groupId}`).get();
    const groupName = groupSnap.exists ? groupSnap.data()?.name ?? "Group" : "Group";

    // Get all members
    const membersSnap = await db.collection(`groups/${groupId}/members`).get();
    const creatorUid = announcement.createdByUid;

    const preview = (announcement.text ?? "").slice(0, 80);

    // Send to all members except the creator
    const promises = membersSnap.docs
      .filter((doc) => doc.id !== creatorUid)
      .map((doc) =>
        sendPush(
          doc.id,
          "announcements",
          `${groupName} Announcement`,
          preview,
          { type: "announcement", groupId }
        )
      );

    await Promise.all(promises);
  }
);

/**
 * When a post status changes (borrowed/claimed), notify relevant users.
 */
export const onPostStatusChanged = onDocumentUpdated(
  "groups/{groupId}/posts/{postId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only trigger when status changes from 'open' to 'borrowed' or 'claimed'
    if (before.status === after.status) return;
    if (after.status !== "borrowed" && after.status !== "claimed") return;

    const { groupId, postId } = event.params;
    const authorUid = after.authorUid;
    if (!authorUid) return;

    const isDawa = after.type === "dawa";

    await sendPush(
      authorUid,
      "statusUpdates",
      isDawa ? "Donation claimed!" : "Request fulfilled!",
      isDawa
        ? `Someone has been chosen for "${after.text?.slice(0, 50) ?? ""}"`
        : `Your request "${after.text?.slice(0, 50) ?? ""}" has been matched`,
      { type: "statusUpdate", postId, groupId }
    );
  }
);

/**
 * When a thread is closed and review is needed, notify the participants.
 */
export const onThreadClosed = onDocumentUpdated(
  "groups/{groupId}/threads/{threadId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only trigger when isOpen changes from true to false
    if (before.isOpen === after.isOpen) return;
    if (after.isOpen !== false) return;

    const { groupId, threadId } = event.params;
    const needsReviewBy: string[] = after.needsReviewBy ?? [];

    const promises = needsReviewBy.map((uid: string) =>
      sendPush(
        uid,
        "reviewReminders",
        "Review needed",
        "The transaction is complete. Please leave a review.",
        { type: "reviewReminder", threadId, groupId }
      )
    );

    await Promise.all(promises);
  }
);
