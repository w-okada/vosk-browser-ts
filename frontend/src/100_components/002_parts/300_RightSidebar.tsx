import React, { useEffect, useMemo } from "react";
import { useStateControlCheckbox } from "../003_hooks/useStateControlCheckbox";
import { AnimationTypes, HeaderButton, HeaderButtonProps } from "./101_HeaderButton";
import { TranscribeController } from "./310_TranscribeController";

export const RightSidebar = () => {
    const sidebarAccordionScreenRecorderControllerCheckBox = useStateControlCheckbox("screen-recorder-controller");

    const accodionButtonForScreenRecorderController = useMemo(() => {
        const accodionButtonForScreenRecorderControllerProps: HeaderButtonProps = {
            stateControlCheckbox: sidebarAccordionScreenRecorderControllerCheckBox,
            tooltip: "Open/Close",
            onIcon: ["fas", "caret-up"],
            offIcon: ["fas", "caret-up"],
            animation: AnimationTypes.spinner,
            tooltipClass: "tooltip-right",
        };
        return <HeaderButton {...accodionButtonForScreenRecorderControllerProps}></HeaderButton>;
    }, []);



    useEffect(() => {
        sidebarAccordionScreenRecorderControllerCheckBox.updateState(true);
    }, []);
    return (
        <>
            <div className="right-sidebar">
                {sidebarAccordionScreenRecorderControllerCheckBox.trigger}
                <div className="sidebar-partition">
                    <div className="sidebar-header">
                        <div className="sidebar-header-title">Transcribe Setting</div>
                        <div className="sidebar-header-caret"> {accodionButtonForScreenRecorderController}</div>
                    </div>
                    <TranscribeController />
                </div>


            </div>
        </>
    );
};
