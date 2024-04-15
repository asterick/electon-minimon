import "normalize.css/normalize.css";
import "rc-dock/dist/rc-dock.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

import { DockLayout, LayoutData } from 'rc-dock'

import Minimon from "./system";
import Screen from "./screen";

import SystemContext from "./context";

export async function getApp() {
  const system = await Minimon.getMinimon();
  system.running = true;

  const defaultLayout:LayoutData = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          tabs: [
            { id: 'screen', title: 'Screen', content: <Screen /> }
          ]
        }
      ]
    }
  };
  
  return (
    <SystemContext.Provider value={system}>
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
    </SystemContext.Provider>
  );
}
