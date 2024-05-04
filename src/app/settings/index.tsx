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

import { useContext, useState, useEffect } from 'react';
import { GradientPicker } from 'react-linear-gradient-picker';
import { SketchPicker } from 'react-color';
import {
  Button,
  Slider,
  HTMLSelect,
  FormGroup,
  ControlGroup,
  OptionProps,
} from '@blueprintjs/core';

import SystemContext from '../context';

import 'react-linear-gradient-picker/dist/index.css';
import './index.css';

const blendingTypeValues: OptionProps<string>[] = [
  { value: 'disabled', label: 'No Blending' },
  { value: 'logorithmic', label: 'Realistic Ghosting' },
  { value: 'true-gray', label: 'Pure gray' },
  { value: 'custom', label: 'Custom Weights' },
];

const darkModeValues: OptionProps<string>[] = [
  { value: "system", label: "System theme" },
  { value: true, label: "Dark Mode" },
  { value: false, label: "Light Mode" },
];

export default function Settings() {
  const context = useContext(SystemContext);

  const [volume, setVolume] = useState(context.store.get('volume'));
  const [frames, setFrames] = useState(context.store.get('frames'));
  const [blendingType, setBlendingType] = useState(context.store.get('blendingType'));
  const [weights, setWeights] = useState(context.store.get('weights'));
  const [intensity, setIntensity] = useState(context.store.get('intensity'));
  const [palette, setPalette] = useState(context.store.get('palette'));
  const [darkMode, setDarkMode] = useState(context.store.get('darkMode'));

  useEffect(() => {
    context.store.set('volume',volume);
    context.store.set('frames',frames);
    context.store.set('blendingType',blendingType);
    context.store.set('weights',weights);
    context.store.set('intensity', intensity);
    context.store.set('palette',palette);
    context.store.set('darkMode',darkMode);
  });

  function resetDefaults () {
    context.store.set('volume', null);
    context.store.set('frames', null);
    context.store.set('blendingType', null);
    context.store.set('weights', null);
    context.store.set('intensity',  null);
    context.store.set('palette', null);
    context.store.set('darkMode', null);

    setVolume(context.store.get('volume'));
    setFrames(context.store.get('frames'));
    setBlendingType(context.store.get('blendingType'));
    setWeights(context.store.get('weights'));
    setIntensity(context.store.get('intensity'));
    setPalette(context.store.get('palette'));
    setDarkMode(context.store.get('darkMode'));
  };


  const WrappedColorPicker = ({ onSelect, ...rest }) =>
    <SketchPicker {...rest} disableAlpha onChange={(c) => onSelect(c.hex)} />

  return (
    <div className="settings">
      <FormGroup label="Theme">
        <HTMLSelect
            fill
            value={darkMode}
            iconName="caret-down"
            options={darkModeValues}
            onChange={(e) => setDarkMode(e.target.value)}
            />
      </FormGroup>

      <FormGroup label="System Volume">
        <Slider
          min={0.0}
          max={1.0}
          stepSize={0.01}
          labelStepSize={0.2}
          labelRenderer={(v) => `${Math.floor(v * 100)}%`}
          onChange={setVolume}
          value={volume}
        />
      </FormGroup>

      <FormGroup>
        <HTMLSelect
          fill
          value={blendingType}
          iconName="caret-down"
          options={blendingTypeValues}
          onChange={(e) => setBlendingType(e.target.value)}
          />
      </FormGroup>

      {blendingType === 'custom' && (
        <FormGroup label="Frame Weights">
          <ControlGroup fill={true}>
            {weights.map((value, i) => (
              <Slider

                key={i}
                min={0.0}
                max={1.0}
                stepSize={0.01}
                vertical
                value={value}
                onChange={(newValue) => {
                  const newWeights = [...weights];
                  newWeights[i] = newValue;
                  setWeights(newWeights);
                }}
              />
            ))}
          </ControlGroup>
        </FormGroup>
      )}

      {blendingType === 'true-gray' && (
        <FormGroup label="Blending Frames">
          <Slider min={2} max={8} onChange={setFrames} value={frames} />
        </FormGroup>
      )}

      {blendingType === 'logorithmic' && (
        <FormGroup label="Persistence">
          <Slider
            min={0.0}
            max={1.0}
            stepSize={0.01}
            labelStepSize={0.2}
            labelRenderer={(v) => `${Math.floor(v * 100)}%`}
            onChange={setIntensity}
            value={intensity}
          />
        </FormGroup>
      )}

      <GradientPicker palette={palette} onPaletteChange={setPalette}>
        <WrappedColorPicker />
      </GradientPicker>

      <FormGroup style={{paddingTop: "10px"}}>
        <ControlGroup fill={true}>
          <Button onClick={resetDefaults}>Reset to Default</Button>
        </ControlGroup>
      </FormGroup>
    </div>
  );
}
