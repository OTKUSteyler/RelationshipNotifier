import { after } from "@vendetta/patcher";
import { definePlugin } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { findInReactTree } from "@vendetta/utils";
import Settings from "./Settings";

// Default settings
storage.notifyFriendAdds ??= true;
storage.notifyFriendRemovals ??= true;
storage.notifyBlocks ??= true;
storage.notifyUnblocks ??= true;
storage.showInChat ??= true;
storage.ignoreBots ??= false;

// Get required Discord modules
const RelationshipStore = findByProps("getRelationships");
const UserStore = findByProps("getUser", "getUsers");
const { getCurrentUser } = findByProps("getCurrentUser");
const { getRelationshipType } = findByProps("getRelationshipType");

// Relationship types for use with getRelationshipType
const RelationshipTypes = {
  FRIEND: 1,
  BLOCKED: 2,
  PENDING_INCOMING: 3,
  PENDING_OUTGOING: 4,
  IMPLICIT: 5,
  NONE: 0
};

export default definePlugin({
  name: "RelationshipNotifier",
  description: "Notifies you when someone removes you as a friend, adds you as a friend, blocks you, or unblocks you.",
  authors: [
    {
      name: "Your Name",
      id: "your.discord.id"
    }
  ],
  onStart() {
    // Store existing relationships to detect changes later
    this.cachedRelationships = { ...RelationshipStore.getRelationships() };

    // Original patch function (to be restored on plugin stop)
    this.origFunctions = {};

    // Patch relationship change function
    const RelationshipManager = findByProps("removeRelationship", "addRelationship");
    if (RelationshipManager) {
      // Save original functions
      this.origFunctions.removeRelationship = RelationshipManager.removeRelationship;
      this.origFunctions.addRelationship = RelationshipManager.addRelationship;
      this.origFunctions.blockUser = RelationshipManager.blockUser;
      this.origFunctions.unblockUser = RelationshipManager.unblockUser;

      // Monkey patch relationship functions
      RelationshipManager.removeRelationship = this.patchRemoveRelationship(RelationshipManager.removeRelationship);
      RelationshipManager.addRelationship = this.patchAddRelationship(RelationshipManager.addRelationship);
      RelationshipManager.blockUser = this.patchBlockUser(RelationshipManager.blockUser);
      RelationshipManager.unblockUser = this.patchUnblockUser(RelationshipManager.unblockUser);
    }

    // Add a listener for relationship changes
    this.relationshipChangeHandler = this.onRelationshipChange.bind(this);
    RelationshipStore.addChangeListener(this.relationshipChangeHandler);
  },

  onStop() {
    // Remove relationship change listener
    RelationshipStore.removeChangeListener(this.relationshipChangeHandler);

    // Restore original functions if we patched them
    const RelationshipManager = findByProps("removeRelationship", "addRelationship");
    if (RelationshipManager && this.origFunctions) {
      if (this.origFunctions.removeRelationship) 
        RelationshipManager.removeRelationship = this.origFunctions.removeRelationship;
      if (this.origFunctions.addRelationship) 
        RelationshipManager.addRelationship = this.origFunctions.addRelationship;
      if (this.origFunctions.blockUser) 
        RelationshipManager.blockUser = this.origFunctions.blockUser;
      if (this.origFunctions.unblockUser) 
        RelationshipManager.unblockUser = this.origFunctions.unblockUser;
    }
  },

  onRelationshipChange() {
    const currentRelationships = RelationshipStore.getRelationships();
    const selfId = getCurrentUser().id;
    
    // Look for removed relationships
    Object.entries(this.cachedRelationships).forEach(([userId, relationshipType]) => {
      // Skip if user still has a relationship or if it's our own ID
      if (currentRelationships[userId] !== undefined || userId === selfId) return;
      
      const user = UserStore.getUser(userId);
      if (!user) return;
      
      // Skip bots if configured to ignore
      if (storage.ignoreBots && user.bot) return;
      
      // Handle friend removal
      if (relationshipType === RelationshipTypes.FRIEND && storage.notifyFriendRemovals) {
        this.notify(`${user.username} removed you as a friend.`);
      }
    });
    
    // Look for new or changed relationships
    Object.entries(currentRelationships).forEach(([userId, relationshipType]) => {
      // Skip if no change or if it's our own ID
      if (this.cachedRelationships[userId] === relationshipType || userId === selfId) return;
      
      const user = UserStore.getUser(userId);
      if (!user) return;
      
      // Skip bots if configured to ignore
      if (storage.ignoreBots && user.bot) return;
      
      // Handle friend add
      if (relationshipType === RelationshipTypes.FRIEND && 
          this.cachedRelationships[userId] !== RelationshipTypes.FRIEND && 
          storage.notifyFriendAdds) {
        this.notify(`${user.username} added you as a friend.`);
      }
      
      // Handle blocked
      if (relationshipType === RelationshipTypes.BLOCKED && 
          this.cachedRelationships[userId] !== RelationshipTypes.BLOCKED && 
          storage.notifyBlocks) {
        this.notify(`${user.username} blocked you.`);
      }
      
      // Handle unblocked
      if (relationshipType !== RelationshipTypes.BLOCKED && 
          this.cachedRelationships[userId] === RelationshipTypes.BLOCKED && 
          storage.notifyUnblocks) {
        this.notify(`${user.username} unblocked you.`);
      }
    });
    
    // Update cache for next check
    this.cachedRelationships = { ...currentRelationships };
  },

  // Monkey patch handlers
  patchRemoveRelationship(original) {
    return (...args) => {
      const userId = args[0];
      const user = UserStore.getUser(userId);
      const relationshipType = getRelationshipType(userId);
      
      if (user && relationshipType === RelationshipTypes.FRIEND && storage.notifyFriendRemovals) {
        // Skip bots if configured to ignore
        if (!(storage.ignoreBots && user.bot)) {
          this.notify(`You removed ${user.username} as a friend.`);
        }
      }
      
      return original(...args);
    };
  },
  
  patchAddRelationship(original) {
    return (...args) => {
      const userId = args[0];
      const user = UserStore.getUser(userId);
      
      if (user && storage.notifyFriendAdds) {
        // Skip bots if configured to ignore
        if (!(storage.ignoreBots && user.bot)) {
          this.notify(`You added ${user.username} as a friend.`);
        }
      }
      
      return original(...args);
    };
  },
  
  patchBlockUser(original) {
    return (...args) => {
      const userId = args[0];
      const user = UserStore.getUser(userId);
      
      if (user && storage.notifyBlocks) {
        // Skip bots if configured to ignore
        if (!(storage.ignoreBots && user.bot)) {
          this.notify(`You blocked ${user.username}.`);
        }
      }
      
      return original(...args);
    };
  },
  
  patchUnblockUser(original) {
    return (...args) => {
      const userId = args[0];
      const user = UserStore.getUser(userId);
      
      if (user && storage.notifyUnblocks) {
        // Skip bots if configured to ignore
        if (!(storage.ignoreBots && user.bot)) {
          this.notify(`You unblocked ${user.username}.`);
        }
      }
      
      return original(...args);
    };
  },

  // Helper to show notifications
  notify(content) {
    showToast(content, { duration: 5000 });
  },

  // Settings page component
  settings: Settings
});
