import { spawn } from "child_process";
import { resolve } from "path";
import { error, info } from "./debug";
import { trayContextMenu } from "../managers/trayManager";
import { MenuItem, app, dialog } from "electron";
import { tray } from "../managers/trayManager";
import { platform } from "os";
import { updateCheckerInterval } from "../index";
import { existsSync } from "fs";
import sudoPrompt from "sudo-prompt";

let updaterPath: string;

export async function checkForUpdate(autoUpdate = false) {
  if (!app.isPackaged) {
    info("Skipping UpdateChecker");
    return;
  }

  switch (platform()) {
    case "darwin":
      updaterPath = resolve(
        `${app.getAppPath()}../../../../../updater.app/Contents/MacOS/installbuilder.sh`
      );
      break;
    case "win32":
      updaterPath = resolve(`${app.getAppPath()}../../../updater.exe`);
      break;
  }

  if (!existsSync(updaterPath)) {
    error("Updater not found.");
    return;
  }

  let child = spawn(updaterPath, ["--mode", "unattended"]);

  child.on("error", err => {
    // @ts-ignore
    if (err.code === "ENOENT") {
      error("Updater file not found. Skipping updater functions.");
      clearInterval(updateCheckerInterval);
      return;
    }
  });

  child.on("exit", code => {
    //* If no update return
    if (code === 1) {
      info("Up to date!");
      return;
    }

    //* If autoUpdate == true
    if (autoUpdate) {
      update();
      return;
    }

    if (trayContextMenu.items.length < 3) {
      trayContextMenu.insert(
        0,
        new MenuItem({
          label: "Update available!",
          click() {
            update();
          }
        })
      );

      trayContextMenu.insert(
        1,
        new MenuItem({
          type: "separator"
        })
      );
      tray.setContextMenu(trayContextMenu);
    }
  });
}

export function update() {
  sudoPrompt.exec(
    `\"${updaterPath}\" --mode unattended --unattendedmodebehavior download`,
    {
      name: app.getName()
    },
    (error: Error) => {
      dialog.showMessageBox({ message: error.message });
      if (error) {
        checkForUpdate();
        return;
      }
    }
  );
}
