import SystemContext from "../context";

import { ButtonGroup, Button } from "@blueprintjs/core";
import "./style.css";

export default function Debugger () {
  return (
    <div className="toolbar">
      <ButtonGroup fill={true}>
          <Button icon={this.context.running ? "stop" : "play"} onClick={(e) => this.context.running = !this.context.running}>{this.context.running ? "Stop" : "Play"}</Button>
          <Button icon="reset" onClick={(e) => this.context.reset()}>Reset</Button>
          <Button icon="step-forward" onClick={(e) => this.context.step()}>Step</Button>
          <Button fill={true} disabled={true} />
        </ButtonGroup>
      </div>
  );
}
