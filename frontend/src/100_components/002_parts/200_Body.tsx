import React, { useEffect, useMemo } from "react";
import { useAppState } from "../../003_provider/003_AppStateProvider";
import { PLAY_VIDEO_ID } from "../const";
// import { RECORDING_CANVAS_ID } from "../../const";
// import { TARGET_SCREEN_VIDEO_ID } from "../../const";
// import { useAppSetting } from "../../003_provider/001_AppSettingProvider";
// import { useAppState } from "../../003_provider/003_AppStateProvider";



export const Body = () => {
    const { frontendManagerState } = useAppState()

    const texts = useMemo(() => {
        const texts = frontendManagerState.result.map((x, index) => {
            return <p className="body-content-text-fixed" key={x + " " + index}>{x}</p>
        })
        texts.push(
            <p className="body-content-text-partial" key={frontendManagerState.partialResult}>{frontendManagerState.partialResult}</p>
        )
        return texts
    }, [frontendManagerState.result, frontendManagerState.partialResult])

    useEffect(() => {
        const obj = document.getElementById("body-content-text") as HTMLDivElement;
        obj.scrollTop = obj.scrollHeight;
    }, [frontendManagerState.result, frontendManagerState.partialResult])

    return (
        <div className="body-content">

            <div className="body-content-upper">
                <video className="body-main-video" id={PLAY_VIDEO_ID} controls></video>
                {/* <div className="body-content-upper-left">
                </div>
                <div className="body-content-upper-right">
                </div> */}
            </div>
            <div className="body-content-lower">
                <div id="body-content-text" className="body-content-text">
                    {texts}
                </div>
            </div>
        </div>
    );
};
