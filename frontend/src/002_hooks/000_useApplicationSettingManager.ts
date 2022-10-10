import { useEffect, useState } from "react"
import { ApplicationSetting, fetchApplicationSetting } from "../001_clients_and_managers/000_ApplicationSettingLoader"

export type ApplicationSettingManagerStateAndMethod = {
    applicationSetting: ApplicationSetting | null
    clearLocalStorage: () => void
    setDefaultLanguage: (lang: string) => void
}

export const useApplicationSettingManager = (): ApplicationSettingManagerStateAndMethod => {
    const [applicationSetting, setApplicationSetting] = useState<ApplicationSetting | null>(null)

    /** (1) Initialize Setting */
    /** (1-1) Load from localstorage */
    const loadApplicationSetting = async () => {
        if (localStorage.applicationSetting) {
            const applicationSetting = JSON.parse(localStorage.applicationSetting) as ApplicationSetting
            console.log("Load AppStteing from Local Storage", applicationSetting)
            setApplicationSetting({ ...applicationSetting })
        } else {
            const applicationSetting = await fetchApplicationSetting()
            console.log("Load AppStteing from Server", applicationSetting)
            setApplicationSetting({ ...applicationSetting })
        }
    }
    useEffect(() => {
        loadApplicationSetting()
    }, [])

    const clearLocalStorage = () => { localStorage.clear() }
    const setDefaultLanguage = (lang: string) => {
        if (!applicationSetting) {
            return
        }
        applicationSetting.default_lang = lang
        localStorage.applicationSetting = JSON.stringify(applicationSetting)
        setApplicationSetting({ ...applicationSetting })
    }

    return {
        applicationSetting,
        clearLocalStorage,
        setDefaultLanguage,
    }
}

