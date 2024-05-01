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

import { useContext, useState, useEffect } from "react";
import { GradientPicker } from 'react-linear-gradient-picker';
import { SketchPicker } from 'react-color';
import { Label, Slider, HTMLSelect, FormGroup, ControlGroup } from "@blueprintjs/core";

import SystemContext from "../context";

import 'react-linear-gradient-picker/dist/index.css';
import './index.css';

const WrappedColorPicker = ({ onSelect, ...rest }) => {
  return (
    <SketchPicker {... rest}
            disableAlpha={true}
            onChange={(c) => onSelect(c.hex)}
            />
  );
}

const blendingTypeValues: OptionProps<string>[] = [
  { value: "disabled", label: "No Blending" },
  { value: "logorithmic", label: "Realistic Ghosting" } ,
  { value: "true-gray", label: "Pure gray" } ,
  { value: "custom", label: "Custom Weights" },
];

export default function Settings() {
	const context = useContext(SystemContext);
  const settings = context.store.get('settings');

  const [volume, setVolume] = useState(settings.volume);
  const [frames, setFrames] = useState(settings.frames);
  const [blendingType, setBlendingType] = useState(settings.blendingType);
  const [weights, setWeights] = useState(settings.weights);
  const [intensity, setIntensity] = useState(settings.intensity);
  const [palette, setPalette] = useState(settings.palette);

  useEffect(() => {
    context.store.set('settings', {
      volume, frames, blendingType, weights, intensity, palette
    });
  });

  return (
    <div>
      <FormGroup label="System Volume">
        <Slider
          min={0.0}
          max={1.0}
          stepSize={0.01}
          labelStepSize={0.2}
          labelRenderer={(v) => `${Math.floor(v*100)}%`}
          onChange={setVolume}
          value={volume}
          />
      </FormGroup>

      <FormGroup>
        <HTMLSelect
            fill={true}
            value={blendingType}
            iconName="caret-down"
            options={blendingTypeValues}
            onChange={(e) => setBlendingType(e.target.value)}
            />
      </FormGroup>

      {blendingType == "custom" &&
      <FormGroup label="Frame Weights">
        <ControlGroup>
          {
            weights.map((v, i) =>
              <Slider
                min={0.0}
                max={1.0}
                stepSize={0.01}
                vertical={true}
                value={weights[i]}
                onChange={(v) => {
                  let newWeights = [... weights];
                  newWeights[i] = v;
                  setWeights(newWeights);
                }}
                />
            )
          }
        </ControlGroup>
      </FormGroup>
      }

      {blendingType == "true-gray" &&
      <FormGroup label="Blending Frames">
        <Slider
          min={2}
          max={8}
          onChange={setFrames}
          value={frames}
          />
      </FormGroup>
      }

      {blendingType == "logorithmic" &&
      <FormGroup label="Persistence">
        <Slider
          min={0.0}
          max={1.0}
          stepSize={0.01}
          labelStepSize={0.2}
          labelRenderer={(v) => `${Math.floor(v*100)}%`}
          onChange={setIntensity}
          value={intensity}
          />
      </FormGroup>
      }

      <GradientPicker
        palette={palette}
        onPaletteChange={setPalette} >
        <WrappedColorPicker />
      </GradientPicker>
    </div>
  );
}
