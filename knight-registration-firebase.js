import { db, authReady } from "./firebase-config.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const CLASS_CODE_KEY = "aurilia.class.code.v1";
const CODE_PATTERN = /^AU-[A-HJ-NP-Z2-9]{4}$/;

window.AuriliaClassroom = {
  async validateCode(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) return { valid: false, message: "Enter a valid Royal Class Code (AU-XXXX)." };
    try {
      await authReady;
      const snapshot = await getDoc(doc(db, "classrooms", code));
      if (!snapshot.exists()) return { valid: false, message: "This Royal Class Code does not exist." };
      const classroom = snapshot.data();
      if (!["scheduled", "active"].includes(classroom.status)) {
        return { valid: false, message: "This classroom is not accepting Knights." };
      }
      return { valid: true, code, classroomName: classroom.name, status: classroom.status };
    } catch (error) {
      console.error("Classroom validation failed:", error);
      return { valid: false, message: "Could not verify the classroom. Check your connection." };
    }
  },

  async registerKnight({ knightId, classCode, playerName, totalXP, rank, trials }) {
    const user = await authReady;
    const code = String(classCode || "").trim().toUpperCase();
    const id = String(knightId || "");
    const name = String(playerName || "").trim();
    if (!CODE_PATTERN.test(code) || !/^knight:[0-9a-f-]{36}$/i.test(id) || !name || name.length > 24) {
      throw new Error("Invalid Knight registration details.");
    }
    // Only initial registration here; XP syncing is implemented in Step 12.
    // Scheduled registration starts with 0 official XP; active registration can carry summons bonus.
    const classroomSnap = await getDoc(doc(db, "classrooms", code));
    if (!classroomSnap.exists() || !["scheduled", "active"].includes(classroomSnap.data().status)) {
      throw new Error("Classroom is not accepting registrations.");
    }
    const safeXP = classroomSnap.data().status === "active" && totalXP === 5 ? 5 : 0;
    const data = {
      knightId: id,
      playerName: name,
      classCode: code,
      ownerUid: user.uid,
      totalXP: safeXP,
      rank: "Royal Candidate",
      completedTrials: 0,
      summonsBonus: safeXP,
      trials: {
        game01: {xp:0, completed:false}, game02: {xp:0, completed:false},
        game03: {xp:0, completed:false}, game04: {xp:0, completed:false}
      },
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, "classrooms", code, "knights", id), data);
    return { knightId: id, classCode: code, ownerUid: user.uid };
  },

  async verifyKnightOwner(knightId, classCode) {
    const user = await authReady;
    const code = String(classCode||'').trim().toUpperCase();
    if (!CODE_PATTERN.test(code) || !/^knight:[0-9a-f-]{36}$/i.test(knightId)) return false;
    const snapshot = await getDoc(doc(db,'classrooms',code,'knights',knightId));
    return snapshot.exists() && snapshot.data().ownerUid === user.uid;
  },

  saveCode(code) { localStorage.setItem(CLASS_CODE_KEY, code); },
  getCode() { return localStorage.getItem(CLASS_CODE_KEY) || ""; }
};
