import { Page } from "puppeteer";
import { Repository } from "./line-file-storage.ts";
import { PageFactory, Server, ServerOptions } from "./server.ts";

export interface SpiderService<T> {
    spider(page: Page): Promise<T[]>;
}

export interface SubmitService<T> {
    submit(page: Page, key: T): Promise<void>;
}

export interface SetupService {
    prepare(page: Page): Promise<void>;
}

export class ServerDi<T> extends Server<T> {

    private setupService?: SetupService;
    private spiderService: SpiderService<T>;
    private submitService: SubmitService<T>;

    constructor(identifier: string,
                pageFactory: PageFactory,
                repository: Repository<T>,
                spider: SpiderService<T>,
                submit: SubmitService<T>,
                setup?: SetupService,
                options?: ServerOptions) {
        super(identifier, pageFactory, repository, options);

        this.spiderService = spider;
        this.submitService = submit;
        this.setupService = setup;
    }

    async prepare(page: Page): Promise<void> {
        await this.setupService?.prepare(page);
    }

    async spider(page: Page): Promise<T[]> {
        return this.spiderService.spider(page);
    }

    async submit(page: Page, key: T): Promise<void> {
        return this.submitService.submit(page, key);
    }

}


