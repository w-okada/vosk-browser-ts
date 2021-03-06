import React from "react";
import { Credit, CreditProps } from "@dannadori/demo-base";
import { Card } from "./components/Card";

export const Controller = () => {
    // (1) Initialize

    // (2) GUI
    const creditProps: CreditProps = {
        title: "Created by w-okada.",
        homepage: "https://github.com/w-okada/vosk-browser-ts",
        github: "https://github.com/w-okada/vosk-browser-ts",
        twitter: "https://twitter.com/DannadoriYellow",
        linkedin: "https://www.linkedin.com/in/068a68187/",
        blog: "https://medium.com/@dannadori",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Credit {...creditProps}></Credit>
            <Card></Card>
        </div>
    );
};
