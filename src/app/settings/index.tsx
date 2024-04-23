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

import { Component, useState } from "react";
import { GradientPicker } from 'react-linear-gradient-picker';
import { SketchPicker } from 'react-color';

import Minimon from "../system";
import SystemContext from "../context";

import 'react-linear-gradient-picker/dist/index.css';
import './index.css';

const WrappedColorPicker = ({ onSelect, ...rest }) => {
	return (
		<SketchPicker {...rest}
            disableAlpha={true}
					  onChange={c => {
						  const { r, g, b } = c.rgb;
						  onSelect(`rgb(${r}, ${g}, ${b})`);
					  }}/>
	);
}

export default class Settings extends Component {
	static contextType = SystemContext;

  private context:Minimon;

  constructor(props) {
    super(props);

    this.state = {
      palette: [
        { offset: '0.00', color: 'rgb(183, 202, 183)' },
        { offset: '1.00', color: 'rgb(6, 24, 6)' }
      ]
    };
  }

  const setPalette = (palette) => {
    this.setState({ palette })
  }

	render() {
		return (
      <GradientPicker {...{
        paletteHeight: 32,
        palette: this.state.palette,
        onPaletteChange: this.setPalette
      }}>
        <WrappedColorPicker/>
      </GradientPicker>
		);
	}
}
