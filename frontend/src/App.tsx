import React, { useEffect, useState } from "react";
import "./App.css";
import { createModel, KaldiRecognizer } from "vosk-browser";
import { RecognizerMessage } from "vosk-browser/dist/interfaces";
import { CommonSelector, CommonSelectorProps } from "@dannadori/demo-base";
import MicrophoneStream from "microphone-stream";
import { Duplex, DuplexOptions } from "readable-stream";

type AudioInput = {
    label: string;
    deviceId: string;
};

class AudioStreamer extends Duplex {
    constructor(public recognizer: KaldiRecognizer, options?: DuplexOptions) {
        super(options);
    }

    public _write(chunk: AudioBuffer, _encoding: any, callback: any) {
        const buffer = chunk.getChannelData(0);
        if (this.recognizer && buffer.byteLength > 0) {
            this.recognizer.acceptWaveform(chunk);
        }
        callback();
    }
}

const App = () => {
    const [audioInputs, setAudioInputs] = useState<AudioInput[]>([]);
    const [audioInputDeviceId, setAudioInputDeviceId] = useState<string>();
    const [mediaStream, setMediaStream] = useState<MediaStream>();
    const [recognizer, setRecognizer] = useState<KaldiRecognizer>();

    // (1) Initialize
    //// (1-1) audio input list
    useEffect(() => {
        const getMics = async () => {
            const s = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            s.getTracks().forEach((t) => t.stop());
            navigator.mediaDevices.enumerateDevices().then((devices) => {
                const audioInputs = devices
                    .filter((x) => {
                        return x.kind == "audioinput";
                    })
                    .map((x) => {
                        return {
                            label: x.label,
                            deviceId: x.deviceId,
                        } as AudioInput;
                    });
                console.log("", audioInputs);
                setAudioInputs(audioInputs);
            });
        };
        getMics();
    }, []);

    //// (1-2) vosk-browser
    useEffect(() => {
        const loadVosk = async () => {
            const model = await createModel("vosk/model.tar.gz");
            const recognizer = new model.KaldiRecognizer(48000);
            recognizer.on("result", (message: RecognizerMessage) => {
                console.log(`Result: ${message}`, message);
            });
            recognizer.on("partialresult", (message: any) => {
                console.log(`PartialResult: ${message}`, message.result.partial);
            });
            setRecognizer(recognizer);
        };
        loadVosk();
    }, []);

    //// (1-3) set audio stream
    useEffect(() => {
        if (mediaStream) {
            mediaStream.getTracks().forEach((x) => {
                x.stop();
            });
        }
        const createRecorder = async () => {
            if (!recognizer) {
                console.log("recognizer is null");
                return;
            }
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                    },
                });

                const micStream = new MicrophoneStream({
                    objectMode: true,
                    bufferSize: 1024,
                });
                micStream.setStream(mediaStream);

                const audioStreamer = new AudioStreamer(recognizer, {
                    objectMode: true,
                });
                micStream.pipe(audioStreamer);

                setMediaStream(mediaStream);
            } catch (exception) {
                console.log(exception);
            }
        };
        createRecorder();
    }, [audioInputDeviceId]);

    // (2) UI
    //// (2-1) Microphone
    const micOptions: { [key: string]: string } = {};
    audioInputs.forEach((x) => {
        micOptions[x.label] = x.deviceId;
    });

    const microphoneSelectorProps: CommonSelectorProps<string> = {
        id: "microphone-selector",
        title: "select mic",
        currentValue: audioInputDeviceId || "",
        options: micOptions,
        onChange: (value: string) => {
            setAudioInputDeviceId(value);
        },
    };
    //// (2-2) start
    const start = () => {
        // if (!recorder) {
        //     console.log("recorder is null");
        //     return;
        // }
        // recorder.start(1000);
        // const start_in = async () => {
        //     const context = new AudioContext();
        //     await context.audioWorklet.addModule("bypass-processor.js");
        //     const oscillator = new OscillatorNode(context);
        //     const bypasser = new AudioWorkletNode(context, "bypass-processor");
        //     oscillator.connect(bypasser).connect(context.destination);
        //     oscillator.start();
        // };
        // start_in();
    };

    return (
        <>
            <CommonSelector {...microphoneSelectorProps}></CommonSelector>
            <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "70%" }}>
                <button onClick={start}>start</button>
            </div>
        </>
    );
};

export default App;
