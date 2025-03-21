import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";

const { FormSwitchRow } = Forms;

export default function Settings() {
  useProxy(storage);

  return (
    <>
      <FormSwitchRow
        label="Friend Adds"
        subLabel="Notify when someone adds you as a friend"
        value={storage.notifyFriendAdds}
        onValueChange={(v) => {
          storage.notifyFriendAdds = v;
        }}
      />
      <FormSwitchRow
        label="Friend Removals"
        subLabel="Notify when someone removes you as a friend"
        value={storage.notifyFriendRemovals}
        onValueChange={(v) => {
          storage.notifyFriendRemovals = v;
        }}
      />
      <FormSwitchRow
        label="Blocks"
        subLabel="Notify when someone blocks you"
        value={storage.notifyBlocks}
        onValueChange={(v) => {
          storage.notifyBlocks = v;
        }}
      />
      <FormSwitchRow
        label="Unblocks"
        subLabel="Notify when someone unblocks you"
        value={storage.notifyUnblocks}
        onValueChange={(v) => {
          storage.notifyUnblocks = v;
        }}
      />
      <FormSwitchRow
        label="Ignore Bots"
        subLabel="Don't notify for bot account changes"
        value={storage.ignoreBots}
        onValueChange={(v) => {
          storage.ignoreBots = v;
        }}
      />
    </>
  );
}
