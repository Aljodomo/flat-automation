import {Page} from "puppeteer";
import { UserData } from "../user-data.ts";
import { sendExposeContacted, sendPhoneContactOnly } from "../telegram.ts";
import {chatGpt} from "../openai.ts";
import { clearAndType, getText } from "../puppeteer.ts";


export class ImmoSubmit {

    baseUrl = "https://www.immobilienscout24.de/expose/"

    async submit(page:Page, exposeId: string, userData: UserData) {

        console.log("Applying to expose: " + exposeId)

        const url = this.baseUrl + exposeId

        await page.goto(url)

        if(await this.isPhoneContactOnly(page)) {
            // await immoRepository.addExpose(exposeId)
            return
        }

        if (userData.immoscout_useLogin) {
            await this.login(page, userData.immoscout_username, userData.immoscout_password, url)
        }

        const message = await this.getMessage(page, userData)

        await this.openMessageDialog(page, url, userData)

        console.log("Solving recaptchas")
        await page.solveRecaptchas()

        await this.inputFormValues(page, userData, message);

        // await page.waitForTimeout(60 * 1000)
        await this.submitMessageForm(page)

        await sendExposeContacted(url, message)

        // await immoRepository.addExpose(exposeId)
    }

    private async inputFormValues(page: Page, userData: UserData, message: string) {
        const checkedFormFields = new Set<string>()
        if (userData.immoscout_useLogin) {
            await this.handleLoggedInFormValueInputs(page, userData, message, checkedFormFields);
        } else {
            await this.handleAnonymousFormValueInputs(page, userData, message, checkedFormFields);
        }
        await this.checkCheckedFormFields(page, checkedFormFields);
    }

    private async checkCheckedFormFields(page: Page, checkedFormFields: Set<string>) {
        checkedFormFields.add("#send-user-profile") // By default this is checked

        const formFieldSelectors = await page.$$eval("form[name='contactFormContainer.form'] input", elements => elements.map(el => "#" + el.id))
        const visibleFormFields = []
        for (const selector of formFieldSelectors) {
            if (await this.isVisible(page, selector)) {
                visibleFormFields.push(selector)
            }
        }
        const notCheckedFormFields = visibleFormFields.filter(selector => !checkedFormFields.has(selector))

        if (notCheckedFormFields.length > 0) {
            console.warn("Not all form fields were checked: ", visibleFormFields.filter(selector => !checkedFormFields.has(selector)))
            // TODO handle this case maybe cancel
        } else {
            console.log("All visible form fields were checked: ", visibleFormFields)
        }
    }

    private async handleAnonymousFormValueInputs(page: Page, userData: UserData, message: string, checkedFormFields: Set<string>) {
        console.log("Setting contact form values for anonymous user")
        await this.setMessage(page, userData, message, checkedFormFields)
        await this.setGeneralFormValues(page, userData, checkedFormFields)
    }

    private async handleLoggedInFormValueInputs(page: Page, userData: UserData, message: string, checkedFormFields: Set<string>) {
        console.log("Setting contact form values for logged in user")

        await this.setMessage(page, userData, message, checkedFormFields)
        await this.setGeneralFormValues(page, userData, checkedFormFields)
        await this.setLoggedInFormValues(page, userData, checkedFormFields)
    }

    async getDescriptionText(page: Page) {

        console.log("Getting object description text")
        let message = "Beschreibungstext der Wohnung: "

        let contactPersonSelector = "[data-qa=contactName]";
        let contractPersonTitle = "Ansprechpartner/Firma";
        message = await this.appendTextToMessageIfPresent(page, message, contractPersonTitle, contactPersonSelector);

        let titleSelector = "#expose-title";
        let titleTitle = "Titel";
        message = await this.appendTextToMessageIfPresent(page, message, titleTitle, titleSelector);

        let addressSelector = ".zip-region-and-country";
        let addressTitle = "Adresse";
        message = await this.appendTextToMessageIfPresent(page, message, addressTitle, addressSelector);

        let objectDesSelector = ".is24qa-objektbeschreibung";
        let objectTitle = "Objektbeschreibung";
        message = await this.appendTextToMessageIfPresent(page, message, objectTitle, objectDesSelector);

        let ausSelector = ".is24qa-ausstattung";
        let ausTitle = "Ausstattung";
        message = await this.appendTextToMessageIfPresent(page, message, ausTitle, ausSelector);

        let lageSelector = ".is24qa-lage";
        let lageTitle = "Lage";
        message = await this.appendTextToMessageIfPresent(page, message, lageTitle, lageSelector);

        let sonsSelector = ".is24qa-sonstiges";
        let sonsTitle = "Sonstiges";
        message = await this.appendTextToMessageIfPresent(page, message, sonsTitle, sonsSelector);

        console.log("Collected object description text")
        console.debug(message)
        return message
    }

    private async appendTextToMessageIfPresent(page: Page, message: string, title: string, objectDesSelector: string) {
        await this.clickShowMore(page, objectDesSelector);
        if (await page.$(objectDesSelector)) {
            const objectDescription = await getText(page, objectDesSelector)
            message = this.appendTitleWithDescription(message, title, objectDescription!);
        }
        return message
    }

    private async clickShowMore(page: Page, elementSelector: string) {
        let ele = await page.$(elementSelector)
        if (ele) {
            if (await ele.evaluate((el) => el.classList.contains("is24-long-text-attribute"))) {
                console.log("Clicking on show more: ", elementSelector)
                await page.click(`${elementSelector} + .show-more`)
            }
        }
    }

    private appendTitleWithDescription(message: string, title: string, objectDescription: string) {
        message += "\n\n"
        message += title
        message += ":\n"
        message += objectDescription
        return message
    }

    private async setMessage(page: Page, userData: UserData, message: string, checkedFormFields: Set<string>) {
        console.log("Typing contact message...")
        let selector = "#contactForm-Message";
        await page.waitForSelector(selector)
        await clearAndType(page, selector, message)
        checkedFormFields.add(selector)
    }

    private async getMessage(page: Page, userData: UserData) {
        let message = userData.staticContactMessage;

        if (userData.chatGtp_active) {
            const descriptionText = await this.getDescriptionText(page)
            console.log("Using ChatGTP to construct contact message")
            const userPrompt =
                descriptionText + "\n\n---------------\n\n" +
                userData.chatGtp_messagePrompt + "\n\n" +
                "Der text darf keine Platzhalter enthalten und sollte zwischen 130 und 160 Wörtern lang sein"
            message = await chatGpt(userPrompt, userData.chatGtp_systemPrompt)
            if(message.length > 1100) {
                console.warn("ChatGTP message is too long: " + message.length + " characters")
                console.log("Requesting shorter message from ChatGTP")
                message = await chatGpt(message + "\n\n---------------\n\n" + "Kürze die Nachricht auf 130 Wörter.")
            }
            console.log("ChatGTP message: " + "\n\n---------------\n\n" + message + "\n\n---------------\n\n")
        }
        return message;
    }

    private async setLoggedInFormValues(page: Page, userData: UserData, checkedFormFields: Set<string>) {

        await this.handleApplicationComplete(page, userData, checkedFormFields);

        await this.handleNumberOfPersons(userData, page, checkedFormFields);

        await this.handleEmployment(page, userData, checkedFormFields);

        await this.handleIncome(userData, page, checkedFormFields);

        await this.handleMoveInDate(page, userData, checkedFormFields);

        await this.handlePetOwner(userData, page, checkedFormFields);
    }

    private async handlePetOwner(userData: UserData, page: Page, checkedFormFields: Set<string>) {
        let yesId = "contactForm-hasPets.yes";
        let hasPetsYesSelector = "[id='" + yesId + "']";
        let noId = "contactForm-hasPets.no";
        let hasPetsNoSelector = "[id='" + noId + "']";

        if (userData.petOwner) {
            await this.clickIfVisible(page, hasPetsYesSelector);
        } else {
            await this.clickIfVisible(page, hasPetsNoSelector);
        }

        checkedFormFields.add(yesId)
        checkedFormFields.add(noId)
    }

    private async handleIncome(userData: UserData, page: Page, checkedFormFields: Set<string>) {
        // TODO "OVER_500_UPTO_1000" | "OVER_1000_UPTO_1500" | "OVER_1500_UPTO_2000" | "OVER_2000_UPTO_3000" | "OVER_3000_UPTO_4000" | "OVER_4000_UPTO_5000" | "OVER_5000",
        // await page.select("#contactForm-income", userData.incomeAfterTaxes)
        let incomeSelector = "#contactForm-income";
        let encodeDescriptor = this.getIncomeDescriptor(userData.incomeAfterTaxes);
        await this.selectIfVisible(page, incomeSelector, encodeDescriptor, checkedFormFields);

        let incomeAmountSelector = "#contactForm-incomeAmount";
        await this.clearAndTypeIfVisible(page, incomeAmountSelector, userData.incomeAfterTaxes + "", checkedFormFields);
    }

    private async handleEmployment(page: Page, userData: UserData, checkedFormFields: Set<string>) {
        // "STUDENT" | "PUBLIC_EMPLOYEE" --> Could stay like that
        let employmentRelationShipSelector = "#contactForm-employmentRelationship";
        await this.selectIfVisible(page, employmentRelationShipSelector, userData.employmentRelationship, checkedFormFields);
    }

    private async handleNumberOfPersons(userData: UserData, page: Page, checkedFormFields: Set<string>) {
        // TODO "ONE_PERSON" | "TWO_PERSON" | "FAMILY" | "BIG_GROUP"
        let numberOfPersonsSelector = "#contactForm-numberOfPersons";
        let numberOfPersonsValue = this.getNumberOfPersonsDescriptor(userData);
        await this.selectIfVisible(page, numberOfPersonsSelector, numberOfPersonsValue, checkedFormFields);

        const numberOfAdultsSelector = "#numberOfAdults";
        await this.clearAndTypeIfVisible(page, numberOfAdultsSelector, userData.numberOfAdults + "", checkedFormFields);

        const numberOfKidsSelector = "#numberOfKids";
        await this.clearAndTypeIfVisible(page, numberOfKidsSelector, userData.numberOfAdults + "", checkedFormFields);
    }

    private async handleApplicationComplete(page: Page, userData: UserData, checkedFormFields: Set<string>) {
        let applicationCompleteSelector = "#contactForm-applicationPackageCompleted";
        await this.selectIfVisible(page, applicationCompleteSelector, userData.applicationPackageCompleted + "", checkedFormFields);
    }

    private async handleMoveInDate(page: Page, userData: UserData, checkedFormFields: Set<string>) {
        let nowId = "moveInDateType.now";
        let moveInDateTypeNowSelector = "[id='" + nowId + "']";
        let flexId = "moveInDateType.flex";
        let moveInDateTypeFlexSelector = "[id='" + flexId + "']";
        let concreteId = "moveInDateType.concrete";
        // @ts-ignore
        let moveInDateTypeConcreteSelector = "[id='" + concreteId + "']"; // Not handled yet
        if (userData.moveInDate === "NOW") {
            await this.clickIfVisible(page, moveInDateTypeNowSelector);
        } else {
            await this.clickIfVisible(page, moveInDateTypeFlexSelector);
        }
        checkedFormFields.add(nowId)
        checkedFormFields.add(flexId)
        checkedFormFields.add(concreteId)
    }

    private getIncomeDescriptor(income: number) {
        if (income < 500) {
            return "UNDER_500"
        } else if (income <= 1000) {
            return "OVER_500_UPTO_1000"
        } else if (income <= 1500) {
            return "OVER_1000_UPTO_1500"
        } else if (income <= 2000) {
            return "OVER_1500_UPTO_2000"
        } else if (income <= 3000) {
            return "OVER_2000_UPTO_3000"
        } else if (income <= 4000) {
            return "OVER_3000_UPTO_4000"
        } else if (income <= 5000) {
            return "OVER_4000_UPTO_5000"
        } else {
            return "OVER_5000"
        }
    }

    private getNumberOfPersonsDescriptor(userData: UserData) {
        let numberOfPersonsValue; // TODO make this configurable
        switch (userData.numberOfAdults) {
            case 1:
                numberOfPersonsValue = "ONE_PERSON";
                break
            case 2:
                numberOfPersonsValue = "TWO_PERSON";
                break
            default:
                numberOfPersonsValue = "BIG_GROUP";
                break
        }
        return numberOfPersonsValue;
    }


    private async openMessageDialog(page: Page, url: string, userData: UserData) {
        console.log("Opening message dialog via navigation")
        const slash = url.endsWith("/") ? "" : "#/"
        await page.goto(url + slash + "basicContact/email")
        // await page.waitForRequest("https://www.immobilienscout24.de/expose/profile")
        // await page.waitForSelector("[data-ng-controller=BasicContactController]")
        // await page.waitForSelector("div[data-ng-controller=BasicContactController] .loader.loader-small", {hidden: true})
        await page.waitForTimeout(2000)
        // await page.waitForSelector("#contactForm-Message")
        // if(userData.immoscout_useLogin) {
        //     await page.waitForSelector("#contactForm-income")
        // }
        console.log("Message dialog is now open")
    }

    // TODO add to checkedFormFields
    private async setGeneralFormValues(page: Page, userData: UserData, checkedFormFields: Set<string>) {

        await this.selectIfVisible(page, "contactForm-salutation", userData.gender, checkedFormFields);

        await this.clearAndTypeIfVisible(page, "#contactForm-firstName", userData.firstname, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-lastName", userData.lastname, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-emailAddress", userData.contactEmail, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-phoneNumber", userData.phoneNumber, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-street", userData.street, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-houseNumber", userData.houseNumber, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-postcode", userData.postalCode, checkedFormFields);
        await this.clearAndTypeIfVisible(page, "#contactForm-city", userData.city, checkedFormFields);
    }

    private async submitMessageForm(page: Page) {
        console.log("Final form value: ", await this.getFormData(page, "form[name='contactFormContainer.form']"))
        console.log("SUBMITTING")
        if(process.env.SUBMIT_ENABLED) {
            await page.click("[data-qa=sendButtonBasic]")
            await page.waitForSelector("[data-qa=successMessage]")
        } else {
            console.warn("Skipping submit because SUBMIT_ENABLED is false")
        }
        console.log("Success! Expose was contacted on your behave.")
    }


    private async login(page: Page, email: string, password: string, originUrl: string) {

        if((await page.$(".sso-login--logged-in")) != null) {
            console.log("Already logged in!")
            return
        }

        console.log("Login in...")

        // await page.waitForSelector("div.sso-login")
        // await page.click("div.sso-login")
        console.log("Navigating to login page...")
        await page.goto("https://sso.immobilienscout24.de/sso/login?appName=is24main")

        await page.waitForTimeout(5000)
        // Workaround. I don't know why but without this click on #username times out.
        // I tried
        // page.type " "
        // page.focus "#username"
        // wait long time
        // wait network idle
        await page.screenshot({path: 'tmp/login.png'});
        console.log("Typing email...")
        await clearAndType(page, "#username", email)
        await page.click("#submit")
        console.log("Going to password page...")
        console.log("Typing password...")
        await clearAndType(page, "#password", password)
        await Promise.all([
            page.waitForNavigation(),
            page.click("#loginOrRegistration")
        ])
        console.log("Logged in!")
        console.log("Navigating back to origin url...")
        if(page.url() !== originUrl) {
            await page.goto(originUrl)
        }
    }

    // HELPERS

    async clearAndTypeIfVisible(page: Page, selector: string, value: string, checkedFormFields: Set<string>) {
        if (await this.isVisible(page, selector)) {
            console.log("Setting field: ", selector, " to value: ", value)
            await clearAndType(page, selector, value)
            checkedFormFields.add(selector)
        } else {
            console.log("Skipping field bc selector not visible: ", selector)
        }
    }

    private async isVisible(page: Page, selector: string) {
        try {
            return await page.$eval(selector, (el) => !!(el as HTMLElement).offsetParent);
        } catch (e) {
            return false;
        }
    }

    private async clickIfVisible(page: Page, selector: string) {
        if (await this.isVisible(page, selector)) {
            console.log("Clicking selector: ", selector)
            await page.click(selector)
        }
    }

    private async selectIfVisible(page: Page, selector: string, value: string, checkedFormFields: Set<string>) {
        if (await this.isVisible(page, selector)) {
            console.log(`Selecting [${value}] for [${selector}] form field`)
            await page.select(selector, value)
            checkedFormFields.add(selector)
        } else {
            console.log("Skipping select because selector not visible/present in form: ", selector)
        }
    }

    private async typeIfEmpty(page: Page, selector: string, value: string, checkedFormFields: Set<string>) {
        checkedFormFields.add(selector)
        if (!await this.isVisible(page, selector)) {
            console.log("Skipping typing because selector not visible/present in form: ", selector)
            return
        }
        const textContent = await this.getValue(page, selector);
        // console.log("textContent: ", textContent, " value: ", value, " selector: ", selector)
        if (textContent) {
            console.log(`Skipped typing [${value}] into [${selector}] because element already has text content [${textContent}].`)
            return
        }
        console.log(`Typing [${value}] into [${selector}]`)
        await page.type(selector, value)
    }

    private async getValue(page: Page, selector: string) {
        // @ts-ignore
        return await page.$eval(selector, el => el.value);
    }

    private async getFormData(page: Page, selector: string) {
        // Get the form element
        return await page.evaluate((selector: string) => {
            const form = document.querySelector(selector); // you can use an id like '#myForm' if the form has an id
            // @ts-ignore
            const formData = new FormData(form);
            const jsonObject = {};
            formData.forEach((value, key) => {
                // @ts-ignore
                jsonObject[ key ] = value;
            });
            return jsonObject;
        }, selector);
    }

    private async isPhoneContactOnly(page: Page) {
        const descriptionText = await this.getDescriptionText(page)
        let response = await chatGpt(descriptionText + "\n\n------\n\nIst nur telefonischer Kontakt möglich? Beginne die Antwort mit 'true' oder 'false' und folge mit der Telefonnummer in runden Klammern.")

        const isPhoneOnly = response.trim().startsWith("true")

        if(isPhoneOnly) {
            console.log("Expose is phone contact only")
            const phoneNumber = response.match(/\(([^)]+)\)/)?.[1];
            console.log("Phone number: ", phoneNumber)
            await sendPhoneContactOnly(page.url(), phoneNumber ?? "No phone number found")
            return true
        }

        return false
    }
}
