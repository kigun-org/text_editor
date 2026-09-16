import type { PartialBlock } from "@blocknote/core";
import { DENTAL_ROOM_ID } from "../collab/users";
import odtpTemplate from "../data/template.json";
import { App } from "./App";
import { mountApp } from "./bootstrap";

mountApp(
  <App
    page="dental"
    defaultRoomId={DENTAL_ROOM_ID}
    initialContent={odtpTemplate as PartialBlock[]}
  />,
);
