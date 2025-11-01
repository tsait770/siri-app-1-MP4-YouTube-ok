import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { bindDeviceRoute } from "./routes/devices/bind/route";
import { listDevicesRoute } from "./routes/devices/list/route";
import { unbindDeviceRoute } from "./routes/devices/unbind/route";
import { generateBindingCodeRoute } from "./routes/devices/generate-code/route";
import { verifyBindingCodeRoute } from "./routes/devices/verify-code/route";
import { listBookmarksRoute } from "./routes/bookmarks/list/route";
import { createBookmarkRoute } from "./routes/bookmarks/create/route";
import { updateBookmarkRoute } from "./routes/bookmarks/update/route";
import { deleteBookmarkRoute } from "./routes/bookmarks/delete/route";
import { listFoldersRoute } from "./routes/folders/list/route";
import { createFolderRoute } from "./routes/folders/create/route";
import { updateFolderRoute } from "./routes/folders/update/route";
import { deleteFolderRoute } from "./routes/folders/delete/route";
import { logVoiceCommandRoute } from "./routes/voice/log/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  devices: createTRPCRouter({
    bind: bindDeviceRoute,
    list: listDevicesRoute,
    unbind: unbindDeviceRoute,
    generateCode: generateBindingCodeRoute,
    verifyCode: verifyBindingCodeRoute,
  }),
  bookmarks: createTRPCRouter({
    list: listBookmarksRoute,
    create: createBookmarkRoute,
    update: updateBookmarkRoute,
    delete: deleteBookmarkRoute,
  }),
  folders: createTRPCRouter({
    list: listFoldersRoute,
    create: createFolderRoute,
    update: updateFolderRoute,
    delete: deleteFolderRoute,
  }),
  voice: createTRPCRouter({
    log: logVoiceCommandRoute,
  }),
});

export type AppRouter = typeof appRouter;