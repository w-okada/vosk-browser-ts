import React, { useMemo } from "react";
import { InputTypes } from "../../002_hooks/100_useFrontendManager";
import { useAppSetting } from "../../003_provider/001_AppSettingProvider";
import { useAppState } from "../../003_provider/003_AppStateProvider";
import { useFileInput } from "../003_hooks/useFileInput";
import { DeviceSelector } from "./311_DeviceSelector";

export const TranscribeController = () => {
    const { frontendManagerState } = useAppState()
    const { applicationSettingState } = useAppSetting()
    const { click } = useFileInput()

    const selectLanguageRow = useMemo(() => {
        const appSetting = applicationSettingState.applicationSetting!
        const options = appSetting.langs.map((x) => {
            return (
                <option className="sidebar-content-selector-option" key={x.lang} value={x.lang}>
                    {x.lang}
                </option>
            );
        });

        const selector = (
            <select
                value={appSetting.default_lang}
                onChange={(e) => {
                    applicationSettingState.setDefaultLanguage(e.target.value);
                }}
                className="sidebar-content-selector-select"
            >
                {options}
            </select>
        )

        return (
            <div className="sidebar-content-row-3-7">
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-label">Language:</div>
                </div>
                <div className="sidebar-content-item">
                    {selector}
                </div>
            </div>
        )
    }, [applicationSettingState.applicationSetting?.default_lang])

    const selectInputTypesRow = useMemo(() => {
        const options = Object.keys(InputTypes).map((x) => {
            return (
                <option className="sidebar-content-selector-option" key={x} value={x}>
                    {x}
                </option>
            );
        });

        const selector = (
            <select
                value={frontendManagerState.inputType}
                onChange={(e) => {
                    frontendManagerState.setInputType(e.target.value as InputTypes)
                }}
                className="sidebar-content-selector-select"
            >
                {options}
            </select>
        )

        return (
            <div className="sidebar-content-row-3-7">
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-label">InputType:</div>
                </div>
                <div className="sidebar-content-item">
                    {selector}
                </div>
            </div>
        )

    }, [frontendManagerState.inputType])

    const selectMicDeviceRow = useMemo(() => {
        if (frontendManagerState.inputType != "mic") {
            return <></>
        }
        return (
            <div className="sidebar-content-row-3-7">
                <div className="sidebar-content-row-label">Mic:</div>
                <div className="sidebar-content-row-select">
                    <DeviceSelector deviceType={"audioinput"}></DeviceSelector>
                </div>
            </div>
        )
    }, [frontendManagerState.inputType])


    const fileChooserRow = useMemo(() => {
        if (frontendManagerState.inputType != "file") {
            return <></>
        }
        return (
            <div className="sidebar-content-row-5-5">
                <div className="sidebar-content-row-label"></div>
                <div className="sidebar-content-row-select">
                    <div className="sidebar-content-row-buttons">
                        <div className="sidebar-content-row-button" onClick={() => onChooseFileClicked()}>Load File</div>
                    </div>
                </div>
            </div>
        )
    }, [frontendManagerState.inputType])

    const windowChooserRow = useMemo(() => {
        if (frontendManagerState.inputType != "system") {
            return <></>
        }
        return (
            <div className="sidebar-content-row-5-5">
                <div className="sidebar-content-row-label"></div>
                <div className="sidebar-content-row-select">
                    <div className="sidebar-content-row-buttons">
                        <div className="sidebar-content-row-button" onClick={() => onChooseWindowClicked()}>select source</div>
                    </div>
                </div>
            </div>
        )
    }, [frontendManagerState.inputType])

    const spacerRow = useMemo(() => {
        return (
            <div className="sidebar-content-row-3-7">
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-spacer"></div>
                </div>
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-spacer"></div>
                </div>
            </div>
        )
    }, [frontendManagerState.inputType])

    const startButtonRow = useMemo(() => {
        let buttonMessage = ""
        let statusMessage = ""
        let buttonAction: () => void = () => { }
        switch (frontendManagerState.transcribeStatus) {
            case "not_initialized":
                statusMessage = "not initialized"
                buttonMessage = "start"
                buttonAction = () => { onStartClicked() }
                break
            case "initializing":
                statusMessage = "initializing"
                buttonMessage = "wait..."
                buttonAction = () => { }
                break
            case "recording":
                statusMessage = "recording..."
                buttonMessage = "stop"
                buttonAction = () => { onStopClicked() }
                break
            case "stop":
                statusMessage = "ready"
                buttonMessage = "start"
                buttonAction = () => { onStartClicked() }
                break
        }
        return (
            <div className="sidebar-content-row-7-3">
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-label">Status: {statusMessage} </div>
                </div>
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-buttons">
                        <div className="sidebar-content-row-button" onClick={buttonAction}>{buttonMessage}</div>
                    </div>
                </div>
            </div>
        )
    }, [frontendManagerState.transcribeStatus])


    const clearSettingRow = useMemo(() => {
        return (
            <div className="sidebar-content-row-7-3">
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-label">clear setting </div>
                </div>
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-button" onClick={() => applicationSettingState.clearLocalStorage()}>clear</div>
                </div>
            </div>
        )
    }, [frontendManagerState.transcribeStatus])

    const clearTextRow = useMemo(() => {
        return (
            <div className="sidebar-content-row-7-3">
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-label">clear text </div>
                </div>
                <div className="sidebar-content-item">
                    <div className="sidebar-content-row-button" onClick={() => frontendManagerState.clearResult()}>clear</div>
                </div>
            </div>
        )
    }, [frontendManagerState.transcribeStatus])


    const onChooseFileClicked = async () => {
        try {
            const url = await click("video|audio")
            frontendManagerState.setFileURL(url)
        } catch (exception) {
            alert(exception)
        }

    }

    const onChooseWindowClicked = async () => {
        const constraints: DisplayMediaStreamConstraints = {
            audio: true,
            video: {
                frameRate: 15
            }
        }
        const ms = await navigator.mediaDevices.getDisplayMedia(constraints);
        frontendManagerState.setScreenMediaStream(ms)
    }

    const onStartClicked = async () => {
        frontendManagerState.startTranscribe()
    }
    const onStopClicked = async () => {
        frontendManagerState.stopTranscribe()
    }
    return (
        <div className="sidebar-content">
            {selectLanguageRow}
            {selectInputTypesRow}
            {fileChooserRow}
            {selectMicDeviceRow}
            {windowChooserRow}

            {spacerRow}
            {spacerRow}

            {startButtonRow}

            {clearTextRow}
            {clearSettingRow}

        </div>
    );
};
