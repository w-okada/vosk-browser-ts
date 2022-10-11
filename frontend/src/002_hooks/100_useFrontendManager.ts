import { useEffect, useMemo, useRef, useState } from "react";
import { StateControlCheckbox, useStateControlCheckbox } from "../100_components/003_hooks/useStateControlCheckbox";
import { useAppSetting } from "../003_provider/001_AppSettingProvider";
import { PLAY_VIDEO_ID } from "../100_components/const";
import { createModel, KaldiRecognizer, Model } from "vosk-browser";
import { RecognizerMessage, ServerMessageResult } from "vosk-browser/dist/interfaces";
import MicrophoneStream from "microphone-stream";
import { Duplex, DuplexOptions } from "readable-stream";


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

export const TRANSCRIBE_STATUS = {
    not_initialized: "not_initialized",
    initializing: "initializing",
    stop: "stop",
    recording: "recording",
    converting: "converting",
} as const
export type TRANSCRIBE_STATUS = typeof TRANSCRIBE_STATUS[keyof typeof TRANSCRIBE_STATUS]

export const InputTypes = {
    "file": "file",
    "mic": "mic",
    "system": "system"
} as const
export type InputTypes = typeof InputTypes[keyof typeof InputTypes]

export type StateControls = {
    openRightSidebarCheckbox: StateControlCheckbox
}

type FrontendManagerState = {
    stateControls: StateControls
    transcribeStatus: TRANSCRIBE_STATUS
    inputType: InputTypes
    screenMediaStream: MediaStream
    fileURL: string

    result: string[],
    partialResult: string

};

export type FrontendManagerStateAndMethod = FrontendManagerState & {
    setInputType: (val: InputTypes) => void
    setScreenMediaStream: (ms: MediaStream) => void
    setFileURL: (url: string) => void

    startTranscribe: () => Promise<void>
    stopTranscribe: () => Promise<void>
    clearResult: () => void
}


export const useFrontendManager = (): FrontendManagerStateAndMethod => {
    const { applicationSettingState, deviceManagerState } = useAppSetting()
    const [transcribeStatus, setTranscribeStatus] = useState<TRANSCRIBE_STATUS>("not_initialized")
    const [inputType, _setInputType] = useState<InputTypes>("file")
    const [screenMediaStream, setScreenMediaStream] = useState<MediaStream>(new MediaStream())
    const [fileURL, setFileURL] = useState<string>("")

    const models = useMemo(() => {
        const models: { [lang: string]: Model } = {}
        return models
    }, [])
    const [_recognizer, setRecognizer] = useState<KaldiRecognizer>();
    const resultRef = useRef<string[]>([]);
    const [result, setResult] = useState<string[]>(resultRef.current);
    const [partialResult, setPartialResult] = useState<string>("");

    const micStreamRef = useRef<MicrophoneStream | null>(null)
    const videoMediaStreamRef = useRef<MediaStream | null>(null)

    // (1) Controller Switch
    const openRightSidebarCheckbox = useStateControlCheckbox("open-right-sidebar-checkbox");


    // (3) operation
    const setInputType = (val: InputTypes) => {
        deviceManagerState.setAudioInputDeviceId("none")
        _setInputType(val)
    }

    useEffect(() => {
        stopTranscribe()
        if (inputType != "system") {
            return
        }

        const videoElem = document.getElementById(PLAY_VIDEO_ID) as HTMLVideoElement
        // videoElem.pause()
        videoElem.srcObject = screenMediaStream
        videoElem.muted = true
        videoElem.autoplay = true

    }, [screenMediaStream, inputType])

    useEffect(() => {
        stopTranscribe()
        if (inputType != "file") {
            return
        }
        const videoElem = document.getElementById(PLAY_VIDEO_ID) as HTMLVideoElement
        videoElem.pause()
        videoElem.srcObject = null
        videoElem.src = fileURL
        videoElem.muted = false
        videoElem.autoplay = false
    }, [fileURL])

    useEffect(() => {
        stopTranscribe()
        if (inputType != "mic") {
            return
        }

        const videoElem = document.getElementById(PLAY_VIDEO_ID) as HTMLVideoElement
        videoElem.pause()
        videoElem.srcObject = null
        videoElem.src = ""
        videoElem.volume = 0
        videoElem.autoplay = true


        if (!deviceManagerState.audioInputDeviceId || deviceManagerState.audioInputDeviceId === "none") {
            return
        }

        const loadAudioInput = async () => {
            const ms = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: deviceManagerState.audioInputDeviceId!
                }
            })

            videoElem.srcObject = ms
            videoElem.play()
        }
        loadAudioInput()
    }, [deviceManagerState.audioInputDeviceId])


    // Transcribe Operations
    const startTranscribe = async () => {

        setTranscribeStatus("initializing")
        console.log("start1")

        // (1) get MediaStream
        if (videoMediaStreamRef.current) {
            // videoMediaStreamRef.current.getTracks().forEach(x => { x.stop() })
            videoMediaStreamRef.current = null
        }
        const videoElem = document.getElementById(PLAY_VIDEO_ID) as HTMLVideoElement

        // @ts-ignore
        const ms = videoElem.captureStream() as MediaStream
        videoMediaStreamRef.current = ms

        let sampleRate = 16000
        ms.getAudioTracks().forEach(x => {
            console.log(x.getCapabilities())
            console.log(x.getConstraints())
            console.log(x.getSettings())
            sampleRate = x.getSettings().sampleRate || 16000
        })



        // (2) Initialize VOSK
        const appSetting = applicationSettingState.applicationSetting!
        const modelInfo = appSetting.langs.find((x) => { return x.lang === appSetting.default_lang })
        if (!modelInfo) {
            alert("no langage:" + appSetting.default_lang)
            return
        }

        if (!models[appSetting.default_lang]) {
            const modelURL = modelInfo.url
            models[appSetting.default_lang] = await createModel(modelURL);
        }

        const recognizer = new models[appSetting.default_lang].KaldiRecognizer(sampleRate);
        recognizer.on("result", (message: RecognizerMessage) => {
            // console.log(`Result: ${message}`, message);
            const res = message as ServerMessageResult;
            console.log(res)
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

        // (3) setup input
        const audioStreamer = new AudioStreamer(recognizer, {
            objectMode: true,
        });
        if (micStreamRef.current) {
            micStreamRef.current.pause()
            // micStreamRef.current.destroy()
        }
        const micStream = new MicrophoneStream({
            objectMode: true,
            bufferSize: 1024,
        });

        try {
            micStream.setStream(ms);
        } catch (exception) {
            alert(exception)
            setTranscribeStatus("stop")
            return
        }
        micStream.pipe(audioStreamer);
        micStreamRef.current = micStream

        setTranscribeStatus("recording")

        // (4) start Video (for file)
        videoElem.play()
    }


    const stopTranscribe = async () => {
        if (micStreamRef.current) {
            micStreamRef.current.pause()
            // micStreamRef.current.destroy()
            micStreamRef.current = null
        }
        setTranscribeStatus("stop")
    }

    const clearResult = () => {
        resultRef.current = [];
        setResult(resultRef.current);
    }

    const returnValue: FrontendManagerStateAndMethod = {
        stateControls: {
            // (1) Controller Switch
            openRightSidebarCheckbox,
        },
        transcribeStatus,
        inputType,
        screenMediaStream,
        fileURL,
        result,
        partialResult,

        setInputType,
        setScreenMediaStream,
        setFileURL,
        startTranscribe,
        stopTranscribe,
        clearResult,

    };
    return returnValue;
};
