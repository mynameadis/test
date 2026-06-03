function registerPlugin(e){window.enmity.plugins.registerPlugin(e)}

const PRESET_CONVERSATIONS = [
  { sender: "fake", text: "hey whats up" },
  { sender: "you", text: "not much, just chillin" },
  { sender: "fake", text: "yo did you see that new thing" },
  { sender: "you", text: "nah what is it" },
  { sender: "fake", text: "bro its insane, you gotta check it out" },
  { sender: "you", text: "ill look into it thanks" },
  { sender: "fake", text: "np man lmk what you think" },
  { sender: "you", text: "for sure" },
  { sender: "fake", text: "aight catch you later" },
  { sender: "you", text: "peace" }
];

const patcher = window.enmity.patcher.create("FakeMessages");

function getModule(...args) {
  return window.enmity.modules.getByProps(...args);
}

const FakeMessages = {
  name: "Fake Messages",
  version: "1.0.0",
  description: "Create fake DM conversations with preset messages",
  authors: [{ name: "You", id: "0" }],
  
  onStart() {
    console.warn("[FM] Plugin started");
    this.patch();
  },
  
  onStop() {
    patcher.unpatchAll();
    console.warn("[FM] Plugin stopped");
  },
  
  patch() {
    try {
      const MessageActions = getModule("sendMessage");
      console.warn("[FM] MessageActions found:", !!MessageActions);

      if (!MessageActions) return;

      patcher.before(MessageActions, "sendMessage", (thisArg, args) => {
        try {
          const msg = args[1];
          if (!msg || !msg.content) return;

          const text = msg.content.trim();
          if (!text.startsWith("fakeconv ")) return;

          const userId = text.slice(9).trim();
          if (!userId || isNaN(userId)) return;

          const UserStore = getModule("getUser", "getCurrentUser");
          if (!UserStore) {
            console.warn("[FM] UserStore not found");
            return;
          }

          const fakeUser = UserStore.getUser(userId);
          const currentUser = UserStore.getCurrentUser();

          if (!fakeUser || !currentUser) {
            console.warn("[FM] User not found");
            return;
          }

          console.warn("[FM] Command detected, creating DM...");
          this.makeDM(userId, fakeUser, currentUser);
          msg.content = "";
        } catch (e) {
          console.error("[FM] Patch callback error:", e);
        }
      });

      console.warn("[FM] Patched successfully");
    } catch (e) {
      console.error("[FM] Patch error:", e);
    }
  },
  
  makeDM(userId, fakeUser, currentUser) {
    try {
      const DMStore = getModule("getDMFromUserId");
      const Actions = getModule("openPrivateChannel");
      
      let MsgStore = getModule("_addMessage");
      if (!MsgStore) MsgStore = getModule("addMessage");
      if (!MsgStore) MsgStore = getModule("receiveMessage");

      console.warn("[FM] Stores - DM:", !!DMStore, "Actions:", !!Actions, "Msgs:", !!MsgStore);

      if (!DMStore || !Actions) {
        console.warn("[FM] Missing critical stores");
        return;
      }

      let dmId = DMStore.getDMFromUserId(userId);
      console.warn("[FM] Initial dmId:", dmId);

      if (!dmId) {
        console.warn("[FM] Opening private channel...");
        Actions.openPrivateChannel(userId);

        setTimeout(() => {
          dmId = DMStore.getDMFromUserId(userId);
          console.warn("[FM] New dmId:", dmId);
          if (dmId && MsgStore) {
            this.insertMsgs(dmId, fakeUser, currentUser, MsgStore);
          }
        }, 500);
        return;
      }

      if (MsgStore) {
        this.insertMsgs(dmId, fakeUser, currentUser, MsgStore);
      }
    } catch (e) {
      console.error("[FM] makeDM error:", e);
    }
  },
  
  insertMsgs(dmId, fakeUser, currentUser, MsgStore) {
    try {
      if (!MsgStore) {
        console.error("[FM] MsgStore is null");
        return;
      }

      const baseTime = Date.now() - 86400000;
      let count = 0;

      for (let i = 0; i < PRESET_CONVERSATIONS.length; i++) {
        const msg = PRESET_CONVERSATIONS[i];
        const author = msg.sender === "fake" ? fakeUser : currentUser;

        const fakeMsg = {
          id: this.snowflake(),
          content: msg.text,
          author: {
            id: author.id,
            username: author.username,
            discriminator: author.discriminator || "0",
            avatar: author.avatar,
            bot: false,
            system: false
          },
          channel_id: dmId,
          timestamp: new Date(baseTime + count * 300000).toISOString(),
          edited_timestamp: null,
          tts: false,
          mention_everyone: false,
          mentions: [],
          mention_roles: [],
          attachments: [],
          embeds: [],
          reactions: [],
          pinned: false,
          type: 0,
          flags: 0
        };

        if (MsgStore._addMessage) {
          MsgStore._addMessage(dmId, fakeMsg);
        } else if (MsgStore.addMessage) {
          MsgStore.addMessage(dmId, fakeMsg);
        } else if (MsgStore.receiveMessage) {
          MsgStore.receiveMessage(dmId, fakeMsg);
        }

        count++;
      }

      console.warn("[FM] Added", count, "messages");
    } catch (e) {
      console.error("[FM] insertMsgs error:", e);
    }
  },
  
  snowflake() {
    const t = BigInt(Date.now() - 1420070400000) << 22n;
    const w = BigInt(Math.floor(Math.random() * 32)) << 17n;
    const p = BigInt(Math.floor(Math.random() * 32)) << 12n;
    const i = BigInt(Math.floor(Math.random() * 4096));
    return (t | w | p | i).toString();
  }
};

registerPlugin(FakeMessages);
