import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { createModel, KaldiRecognizer } from "vosk-browser";
import { RecognizerMessage, ServerMessageResult } from "vosk-browser/dist/interfaces";
import MicrophoneStream from "microphone-stream";
import { Duplex, DuplexOptions } from "readable-stream";
import { AudioInput, useAppState } from "./provider/AppStateProvider";
import { Controller } from "./Controller";
import { CommonSelector, CommonSelectorProps } from "@dannadori/demo-base";

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
    const { audioInputDeviceId, setAudioInputs, audioInputs, setAudioInputDeviceId } = useAppState();

    const [mediaStream, setMediaStream] = useState<MediaStream>();
    const [micStream, setMicStream] = useState<MicrophoneStream>();
    const [recognizer, setRecognizer] = useState<KaldiRecognizer>();
    const resultRef = useRef<string[]>([]);
    const [result, setResult] = useState<string[]>(resultRef.current);
    const [partialResult, setPartialResult] = useState<string>("");
    const [isInitialized, setIsInitialized] = useState(false);
    const [_lastUpdate, setLastUpdate] = useState<number>(0);
    const audioStreamer = useMemo(() => {
        if (!recognizer) {
            return null;
        }
        const audioStreamer = new AudioStreamer(recognizer, {
            objectMode: true,
        });
        return audioStreamer;
    }, [recognizer]);

    // (1) Initialize
    //// (1-1) Mic device
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
                // console.log(`Result: ${message}`, message);
                const res = message as ServerMessageResult;
                if (res.result && res.result.text) {
                    resultRef.current = [...resultRef.current, res.result.text];
                    setResult(resultRef.current);
                }
            });
            recognizer.on("partialresult", (message: any) => {
                // console.log(`PartialResult: ${message}`, message);
                setPartialResult(message.result.partial);
            });
            setRecognizer(recognizer);
        };
        loadVosk();
    }, []);

    //// (1-3) set audio stream
    useEffect(() => {
        if (!audioStreamer) {
            return;
        }
        console.log("AudioInputDevice:", audioInputDeviceId);
        if (mediaStream) {
            mediaStream.getTracks().forEach((x) => {
                x.stop();
            });
        }
        if (micStream) {
            micStream.unpipe();
            micStream.stop();
            micStream.destroy();
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
                micStream.pipe(audioStreamer);
                micStream.pause();

                setMediaStream(mediaStream);
                setMicStream(micStream);
                setIsInitialized(true);
            } catch (exception) {
                console.log(exception);
            }
        };
        createRecorder();
    }, [audioInputDeviceId, audioStreamer]);

    // (2) UI
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

    //// (2-1) toggle start and stop
    const start = () => {
        if (!micStream) {
            console.log("mic null");
            return;
        }
        if (micStream.isPaused()) {
            console.log("mic resume");
            micStream.resume();
        } else {
            console.log("mic puase");
            micStream.pause();
        }
        setLastUpdate(new Date().getTime());
    };
    const clear = () => {
        resultRef.current = [];
        setResult(resultRef.current);
    };
    return (
        <>
            <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "70%" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "70%", height: "100%", margin: "30px" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", width: "100%" }}>
                        <CommonSelector {...microphoneSelectorProps}></CommonSelector>
                        <button onClick={start} className="mt-5 ml-5 p-1 border-solid border-2 border-indigo-600 rounded-lg shadow-lg border-amber-400 bg-amber-100">
                            {!isInitialized ? "initalizing..." : micStream?.isPaused() ? "start transcribe" : "stop transcribe"}
                        </button>
                        <button onClick={clear} className="mt-5 ml-5 p-1 border-solid border-2 border-indigo-600 rounded-lg shadow-lg border-amber-400 bg-amber-100">
                            clear
                        </button>
                    </div>
                    <div className="mt-5">
                        <span className="font-bold">
                            {result.reduce((prev, cur) => {
                                return prev.length === 0 ? cur : `${prev}. ${cur}`;
                            }, "")}{" "}
                        </span>
                        <span className="font-thin text-amber-800"> {partialResult}</span>
                    </div>
                </div>
                <div style={{ width: "30%", height: "100%" }}>
                    <Controller></Controller>
                </div>
            </div>
        </>
    );
};

export default App;
