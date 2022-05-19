import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { createModel, KaldiRecognizer } from "vosk-browser";
import { RecognizerMessage, ServerMessageResult } from "vosk-browser/dist/interfaces";
import MicrophoneStream from "microphone-stream";
import { Duplex, DuplexOptions } from "readable-stream";
import { AudioInput, useAppState } from "./provider/AppStateProvider";
import { Controller } from "./Controller";
import { CommonSelector, CommonSelectorProps, CommonSwitch, CommonSwitchProps } from "@dannadori/demo-base";

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
    const { audioInputDeviceId, setAudioInputs, audioInputs, setAudioInputDeviceId, audioContent, setAudioContent, useMovie, setUseMovie } = useAppState();

    const [mediaStream, setMediaStream] = useState<MediaStream>();
    const [micStream, setMicStream] = useState<MicrophoneStream>();
    const [recognizer, setRecognizer] = useState<KaldiRecognizer>();
    const resultRef = useRef<string[]>([]);
    const [result, setResult] = useState<string[]>(resultRef.current);
    const [partialResult, setPartialResult] = useState<string>("");
    const [isInitialized, setIsInitialized] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number>(0);
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
            let model;
            if (document.domain.includes("localhost")) {
                model = await createModel("./vosk/model.tar.gz");
            } else {
                model = await createModel("./frontend/vosk/model.tar.gz");
            }
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
            const video = document.getElementById("input") as HTMLVideoElement;
            let mediaStream: MediaStream | undefined = undefined;
            if (useMovie) {
                if (audioContent) {
                    video.src = audioContent;
                    video.autoplay = true;
                    // @ts-ignore
                    const ms = video.captureStream();
                    const p = new Promise<void>((resolve, _reject) => {
                        video.onloadeddata = () => {
                            resolve();
                        };
                    });
                    console.log("TRACK", ms.getTracks());
                    await p;
                    console.log("TRACK", ms.getTracks());
                    mediaStream = new MediaStream();
                    ms.getAudioTracks().forEach((x: MediaStreamTrack) => {
                        mediaStream!.addTrack(x);
                    });
                }
            } else {
                video.src = "";
                video.pause();
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                    },
                });
            }
            try {
                const micStream = new MicrophoneStream({
                    objectMode: true,
                    bufferSize: 1024,
                });
                if (mediaStream) {
                    micStream.setStream(mediaStream);
                    micStream.pipe(audioStreamer);
                    micStream.pause();
                }

                setMediaStream(mediaStream);
                setMicStream(micStream);
                setIsInitialized(true);
            } catch (exception) {
                console.log(exception);
            }
        };
        createRecorder();
    }, [useMovie, audioInputDeviceId, audioStreamer, audioContent]);

    // (2) UI
    //// (2-1) mic or movie switch
    const useMovieSwitchProps: CommonSwitchProps = {
        id: "use-movie-switch",
        title: "use movie",
        currentValue: useMovie,
        onChange: (value: boolean) => {
            setUseMovie(value);
            if (value === false) {
                setAudioContent(undefined);
            } else {
                setAudioInputDeviceId(undefined);
            }
            micStream?.pause();
            setLastUpdate(new Date().getTime());
        },
    };

    //// (2-2) mic selection
    const micSelection = useMemo(() => {
        if (useMovie) {
            return <></>;
        }
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
        return <CommonSelector {...microphoneSelectorProps}></CommonSelector>;
    }, [audioInputs, useMovie]);

    //// (2-3) upload movie button
    ////// (2-3-1) handler
    const upload = () => {
        const fileInput = document.getElementById(`file-input`) as HTMLInputElement;
        fileInput.onchange = (event: Event) => {
            if (!event || !event.target) {
                return;
            }
            if (!(event.target instanceof HTMLInputElement)) {
                return;
            }
            if (!event.target.files) {
                return;
            }
            if (!event.target.files[0].type.match("image.*") && !event.target.files[0].type.match("video.*")) {
                console.log("not image file", event.target.files[0].type);
                return;
            }
            console.log(event.target.files[0]);
            const reader = new FileReader();
            reader.onload = () => {
                console.log("read image", reader.result);
                setAudioContent(reader.result as string);
                fileInput.value = "";
            };
            reader.readAsDataURL(event.target.files[0]);
        };
        fileInput.click();
    };
    ////// (2-3-2) button
    const uploadMovieButton = useMemo(() => {
        if (!useMovie) {
            return <></>;
        }
        return (
            <div className="ml-15">
                <button onClick={upload} className="mt-5 ml-5 p-1 border-solid border-2 border-indigo-600 rounded-lg shadow-lg border-amber-400 bg-amber-100">
                    movie
                </button>
            </div>
        );
    }, [useMovie]);
    //// (2-4) start transcribe button
    ////// (2-4-1) handler
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
    ////// (2-4-2) button
    const startTranscribeButton = useMemo(() => {
        if (!isInitialized || !micStream) {
            return <div className="mt-5 ml-5 p-1 rounded-lg shadow-lg ">initialized</div>;
        }
        let text: string = "";
        if (micStream.isPaused()) {
            text = "start transcribe";
        } else {
            text = "stop transcribe";
        }
        return (
            <button onClick={start} className="mt-5 ml-5 p-1 border-solid border-2 border-indigo-600 rounded-lg shadow-lg border-amber-400 bg-amber-100">
                {text}
            </button>
        );
    }, [isInitialized, lastUpdate]);
    //// (2-5) clear text button
    ///// (2-5-1) handler
    const clear = () => {
        resultRef.current = [];
        setResult(resultRef.current);
    };
    ///// (2-5-2) button\
    const clearTextButton = useMemo(() => {
        return (
            <button onClick={clear} className="mt-5 ml-5 p-1 border-solid border-2 border-indigo-600 rounded-lg shadow-lg border-amber-400 bg-amber-100">
                clear text
            </button>
        );
    }, []);

    return (
        <>
            <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "70%" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "70%", height: "100%", margin: "30px" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", width: "100%" }}>
                        <CommonSwitch {...useMovieSwitchProps}></CommonSwitch>
                        {micSelection}
                        {uploadMovieButton}
                        {startTranscribeButton}
                        {clearTextButton}
                    </div>
                    <div id="video-container" style={{ width: "100%", height: "100%", position: "relative" }}>
                        <video id="input" style={{ position: "absolute", objectFit: "contain", maxHeight: "80%" }}></video>
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
                <input type="file" id={`file-input`} hidden></input>
            </div>
        </>
    );
};

export default App;
