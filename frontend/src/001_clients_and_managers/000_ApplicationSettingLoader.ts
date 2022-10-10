
export type ApplicationSetting =
    {
        "app_title": string,
        "langs": {
            "lang": string,
            "size": string,
            "url": string
        }[],
        "default_lang": string
    }


export const fetchApplicationSetting = async (): Promise<ApplicationSetting> => {
    const url = `./assets/setting.json`
    const res = await fetch(url, {
        method: "GET"
    });
    const setting = await res.json() as ApplicationSetting
    return setting;
}


export const fetchModel = async (url: string) => {
    const res = await fetch(url, {
        method: "GET"
    });
    const buf = await res.arrayBuffer()
    console.log("model", buf)
    return buf;
}
