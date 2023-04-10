// Type definitions for wappalyzer-core 6.10
declare module 'wappalyzer-core' {
    export type Price = 'low' | 'mid' | 'high' | 'freemium' | 'poa' | 'payg' | 'onetime' | 'recurring';

    export interface Category {
        id?: number;
        slug?: string;
        groups: number[];
        name: string;
        priority: number;
    }

    export interface DomDetection {
        exists?: string;
        attributes?: Record<string, string>;
        properties?: Record<string, string>;
        text?: string;
    }

    /**
     * Definition structure for a Wappalyzer technology fingerprint.
     * @see {@link https://github.com/wappalyzer/wappalyzer}
     *
     */
    export interface Technology {
        /**
         * The name of the technology.
         */
        name: string;

        /**
         * A short description of the technology in British English (max. 250 characters).
         */
        description?: string;

        /**
         * The technology has an open-source license.
         */
        oss?: boolean;

        /**
         * The technology is offered as a Software-as-a-Service (SaaS), i.e. hosted or cloud-based.
         */
        saas?: boolean;

        /**
         * Cost indicator (based on a typical plan or average monthly price) and available pricing models.
         */
        pricing?: Price[];

        /**
         * One or more category IDs
         */
        cats: [number, ...number[]];

        /**
         * The CPE is a structured naming scheme for applications.
         *
         * @example `cpe:2.3:a:microsoft:internet_explorer:8.0.6001:beta:*:*:*:*:*:*`
         *
         * @see @{link https://cpe.mitre.org/specification/}
         */
        cpe?: string;

        /**
         * Specific cookie values to check for.
         *
         * @example
         * `cookies: { "cookie_name": "Cookie value" }`
         */
        cookies?: Record<string, string>;

        /**
         * JavaScript properties (case sensitive). Avoid short property names to prevent matching minified code.
         *
         * @example
         * `js: { "jQuery.fn.jquery": "" }`
         */
        js?: Record<string, string>;

        /**
         * Uses a query selector to inspect element properties, attributes and text content.
         *
         * @example
         * ```
         * dom: {
         *     "#example-id": {
         *         "property": {"example-prop": "" },
         *         "attribute": { "attribute-name": "" }
         *     }
         * }
         * ```
         */
        dom?: Record<string, DomDetection[]>;

        /**
         * DNS records: supports MX, TXT, SOA and NS (NPM driver only).
         *
         * @example
         * `dns: { "MX": "example\\.com" }`
         */
        dns?: Record<string, string[]>;

        /**
         * HTTP response headers.
         *
         * @example
         * `headers: { "X-Powered-By": "^WordPress$" }`
         */
        headers?: Record<string, string>;

        /**
         * HTML source code. Patterns must include an HTML opening tag to avoid matching plain text. For performance reasons, avoid html where possible and use    dom instead.
         *
         * @example
         * `html: "<a [^>]*href=\"index.html"`
         */
        html?: string[] | string;

        /**
         * Matches plain text. Should only be used in very specific cases where other methods can't be used.
         */
        text?: string[] | string;

        /**
         * Specifics CSS rules whose presence on the page should be detected. Unavailable when a website enforces a same-origin policy.
         * For performance reasons, only a portion of the available CSS rules are used to find matches.
         */
        css?: string[] | string;

        /**
         * Robots.txt contents.
         *
         * @example
         * `robots: "Disallow: /unique-path/"`
         */
        robots?: string[] | string;

        /**
         * Request a URL to test for its existence or match text content (NPM driver only).
         *
         * @example
         * `probe: { "/path": "Example text" }`
         */
        probe?: Record<string, string>;

        /**
         * Opposite of implies. The presence of one application can exclude the presence of another.
         */
        excludes?: string[] | string;

        /**
         * The presence of one application can imply the presence of another, e.g. WordPress means PHP is also in use.
         */
        implies?: string[] | string;

        /**
         * Similar to implies but detection only runs if the required technology has been identified. Useful for themes for a specific CMS.
         */
        requires?: string[] | string;

        /**
         * Similar to requires; detection only runs if a technology in the required category has been identified.
         */
        requiresCategory?: number[] | number;

        /**
         * HTML meta tags, e.g. generator.
         *
         * @example
         * `meta: { "generator": "^WordPress$" }`
         */
        meta?: Record<string, string>;

        /**
         * URLs of JavaScript files included on the page.
         *
         * @example
         * `scriptSrc: "jquery\\.js"`
         */
        scriptSrc?: string[] | string;

        /**
         * JavaScript source code. Inspects inline and external scripts. For performance reasons, avoid    scripts where possible and use js instead.
         *
         * @example
         * `scriptSrc: "function webpackJsonpCallback\\(data\\) {"`
         */
        scripts?: string[] | string;

        /**
         * Full URL of the page.
         *
         * @example
         * `url: "^https?//.+\\.wordpress\\.com"
         */
        url?: string[] | string;

        /**
         * URL of the application's website
         */
        website: string;

        /**
         * Application icon filename
         */
        icon?: string;

        /**
         * Hostnames of XHR requests.
         *
         * @example
         * `xhr: "cdn\\.netlify\\.com"
         */
        xhr?: string[] | string;
    }

    /**
     * A keyed list of properties used by Wappalyzer to determine a web page's technology dependencies.
     */
    export interface Input {
        /**
         * The URL of the web page to be analyzed.
         */
        url?: string;

        /**
         * The raw HTML markup of the web page to be analyzed.
         */
        html?: string;

        /**
         * A dictionary of HTML meta tags; keys should be lowercased, and all values should be string arrays even if only one value exists.
         */
        meta?: Record<string, string[]>;

        /**
         * A dictionary of HTTP response header values; keys should be lowercased, and all values should be string arrays even if only one value exists.
         */
        headers?: Record<string, string[]>;

        /**
         * The name of the page's HTTPS certificate issuer.
         */
        certIssuer?: string;

        /**
         * A dictionary of the page's cookie names and values.
         */
        cookies?: Record<string, string[]>;

        /**
         * The concatenated text of the page's inline CSS.
         */
        css?: string;

        /**
         * A dictionary of DNS records; keys should be the record type.
         */
        dns?: Record<string, string[]>;

        /**
         * The raw text of the site's Robots.txt file, if available.
         */
        robots?: string;

        /**
         * An array of URLs containg the URLs of all remote scripts loaded by the page.
         */
        scriptSrc?: string[];

        /**
         * The concatenated text of all embedded scripts on the page.
         */
        scripts?: string;

        /**
         * An array of URLs to which XmlHttpRequests were made.
         */
        xhr?: unknown,
    }

    export interface Resolution extends Record<string, unknown> {
        name: string;
        description?: string;
        slug?: string;
        categories?: Category[];
        confidence?: number;
        version?: string;
        icon?: string;
        website?: string;
        pricing?: Price[];
        cpe?: string;
        rootPath?: string;
        lastUrl?: string;
    }

    export const technologies: Technology[];
    export const categories: Category[];

    /**
     * Populate the Wappalyzer engine with a list of technology categories.
     */
    export function setCategories(categories: Record<string, Category>): void;

    /**
     * Populate the Wappalyzer engine with a list of technology patterns.
     */
    export function setTechnologies(technologies: Record<string, Technology>): void;

    /**
     * Accepts a {@link Input} object containing page properties and returns an array of
     * {@link Technology} entries that were found on the page. This array can be passed to the
     * {@link resolve} function to populate any inferred technologies and tech categories.
     */
    export function analyze(input: Input, technologies?: Technology[]): Technology[];

    /**
     * Given a list of {@link Technology} entries (usually produced by the {@link analyze} method),
     * build a final list of inferred or excluded technologies, technology categories, and company contact
     * information.
     */
    export function resolve(detections: Technology[]): Resolution[];

    /**
     * Returns the {@link Technology} record for a given product name, if it exists.
     */
    export function getTechnology(name: string): Technology | undefined;

    /**
     * Returns the {@link Category} record for a given ID, if it exists.
     */
    export function getCategory(id: number): Category | undefined;
}