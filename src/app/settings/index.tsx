/*
ISC License

Copyright (c) 2019, Bryon Vandiver

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

import { Component } from "react";
import { GradientPicker } from 'react-linear-gradient-picker';
import { SketchPicker } from 'react-color';
import { Label, Slider } from "@blueprintjs/core";

import Minimon from "../system";
import SystemContext from "../context";

import 'react-linear-gradient-picker/dist/index.css';
import './index.css';

const WrappedColorPicker = ({ onSelect, ...rest }) => {
	return (
		<SketchPicker {...rest}
            disableAlpha={true}
					  onChange={c => onSelect(c.hex)}
					  />
	);
}

export default class Settings extends Component {
	static contextType = SystemContext;

  private context:Minimon;

  constructor(props) {
    super(props);

    this.state = {
      volume: 1,
      stages: 1,
      weights: [1,1,1,1],
      palette: [
        { offset: '0.00', color: '#B7CAB7' },
        { offset: '1.00', color: '#061806' }
      ]
    };
  }

	render() {
		return (
      <div>
        <Label>
          System Volume
          <Slider
            min={0.0}
            max={1.0}
            stepSize={0.01}
            labelStepSize={0.2}
            labelRenderer={(v) => `${Math.floor(v*100)}%`}
            onChange={(volume) => this.setState({volume})}
            value={this.state.volume}
            />
        </Label>

        <Label>
          LCD Blending
          <Slider
            min={1}
            max={8}
            stepSize={1}
            labelStepSize={1}
            onChange={(stages) => this.setState({stages})}
            value={this.state.stages}
            />
        </Label>

        <GradientPicker
          palette={this.state.palette}
          onPaletteChange={(palette) => this.setState({ palette })} >
          <WrappedColorPicker />
        </GradientPicker>
      </div>
		);
	}
}
