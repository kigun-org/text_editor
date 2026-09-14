import type { PartialBlock } from "@blocknote/core";
import { DEFAULT_ROOM_ID } from "../collab/users";
import basicTemplate from "../data/basic.json";
import { App } from "./App";
import { mountApp } from "./bootstrap";

mountApp(
  <App
    page="index"
    defaultRoomId={DEFAULT_ROOM_ID}
    initialContent={basicTemplate as PartialBlock[]}
  />,
);
