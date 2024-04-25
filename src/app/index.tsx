import "normalize.css/normalize.css";
import "rc-dock/dist/rc-dock.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./style.css";

import { DockLayout, LayoutData } from 'rc-dock'

import Minimon from "./machine";
import Screen from "./screen";
import Settings from "./settings";

import SystemContext from "./context";

export async function getApp() {
  const system = await Minimon.getMinimon();

  const defaultLayout:LayoutData = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          tabs: [
            { id: 'system', title: "System", content: <Screen /> },
            { id: 'settings', title: "Settings", content: <Settings /> },
            { id: 'registers', title: "Registers", content: <div></div> }
          ]
        }
      ]
    }
  };

  return (
    <SystemContext.Provider value={system}>
      <div className="pt-dark">
      <DockLayout
        defaultLayout={defaultLayout}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}
        />
        </div>
    </SystemContext.Provider>
  );
}
