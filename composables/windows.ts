import { type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow, PhysicalPosition, type WindowOptions, Window } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { WebviewLabel, WebviewOptions, } from "@tauri-apps/api/webview";
export default async (
	label: WebviewLabel,
	options?: Omit<WebviewOptions, "x" | "y" | "width" | "height"> & WindowOptions,
	afterCreatedFunc?: (webviewWindow: WebviewWindow, appWindow: Window) => void | null,
	beforeCloseFunc?: () => void | null
) => {
    let defaultOpts = {
		parent: undefined,
		closable: true,
		resizable: true,
		decorations: true,
		maximizable: false,
		minimizable: false,
        x: 0,
        y: 0
	};
	const appWindow = getCurrentWindow();
	if (appWindow) {
		const appSize = await appWindow.outerSize();
		const factor = await appWindow.scaleFactor();
		const appPosition = await appWindow.outerPosition();
		const logicalPosition = new PhysicalPosition(appPosition.x + appSize.width, appPosition.y).toLogical(factor);
        defaultOpts.parent = appWindow as any;
        defaultOpts.x = logicalPosition.x;
        defaultOpts.y = logicalPosition.y;
	}
	let unListenlogClose: UnlistenFn | null = null;
	let unlistenLogCreated: UnlistenFn | null = null;
	let dialog = await WebviewWindow.getByLabel(label);
	if (!dialog) {
		dialog = new WebviewWindow(label, {...defaultOpts, ...options});
		unlistenLogCreated = await dialog.once("tauri://webview-created", async () => {
			if (dialog) {
				afterCreatedFunc && (await afterCreatedFunc(dialog, appWindow));
				await dialog.show();
			}
		});
		unListenlogClose = await dialog.onCloseRequested(async () => {
			beforeCloseFunc && (await beforeCloseFunc());
			unListenlogClose && (await unListenlogClose());
		});
	} else {
		const visible = await dialog.isVisible();
		if (visible) {
			await dialog.close();
			unlistenLogCreated && (await (unlistenLogCreated as Function)());
		}
	}
};