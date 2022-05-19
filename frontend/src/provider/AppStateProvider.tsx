import { WindowSize, useWindowStateChangeListener } from "@dannadori/demo-base";
import React, { useContext, useState, ReactNode } from "react";

export type AudioInput = {
    label: string;
    deviceId: string;
};

type Props = {
    children: ReactNode;
};

type AppStateValue = {
    windowSize: WindowSize;
    audioInputDeviceId: string | undefined;
    setAudioInputDeviceId: (val: string) => void;
    audioInputs: AudioInput[];
    setAudioInputs: (val: AudioInput[]) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

export const AppStateProvider = ({ children }: Props) => {
    const { windowSize } = useWindowStateChangeListener();

    const [audioInputDeviceId, setAudioInputDeviceId] = useState<string>();
    const [audioInputs, setAudioInputs] = useState<AudioInput[]>([]);

    const providerValue = {
        windowSize,
        audioInputDeviceId,
        setAudioInputDeviceId,
        audioInputs,
        setAudioInputs,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
