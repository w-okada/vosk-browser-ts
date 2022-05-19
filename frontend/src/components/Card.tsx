import "./cardStyle.css";
import React from "react";

export const Card = () => {
    return (
        <div className="m-4 rounded-xl bg-base-100 shadow-lg">
            <div className="m-4">
                <h1 className="text-xl ">vosk browser demo(Japanese)</h1>
                <h2 className="text-base underline font-black pt-4">Usage</h2>
                <p className="m-1">(1) select microphone.</p>
                <p className="m-1">(2) push start transcribe button.</p>
                <p className="m-1">(3) you can erase the sentance by clear button.</p>

                <h2 className="text-base underline font-black pt-4">link</h2>
                <h2 className="text-base underline">
                    <a className="text-base underline" href="https://screen-recorder-ts.herokuapp.com/frontend/index.html">
                        Screen Capture with ffmpeg-wasm
                    </a>
                </h2>
                <p className="pl-4">Capture your screen or window with just only browser </p>
            </div>
        </div>
    );
};
