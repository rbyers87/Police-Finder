// Admin Page — Agency Contact Management

(function () {
    'use strict';

    const DB_KEY = 'txle_agencies';
    const DEFAULT_KEY = 'txle_default_agency';
    const SEED_VERSION_KEY = 'txle_seed_version';
    const CURRENT_SEED_VERSION = 2; // Bump this to force re-seed
    const PIN_HASH_KEY = 'txle_admin_pin_hash';
    const PIN_SALT_KEY = 'txle_admin_pin_salt';
    const PIN_VERIFIED_KEY = 'txle_admin_pin_verified';

    // ── PIN Protection ──────────────────────────────────────────────────────

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateSalt() {
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);
        return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashPin(pin, salt) {
        return sha256(pin + ':' + salt);
    }

    function hasPinSetup() {
        return !!localStorage.getItem(PIN_HASH_KEY) && !!localStorage.getItem(PIN_SALT_KEY);
    }

    async function verifyPin(pin) {
        const storedHash = localStorage.getItem(PIN_HASH_KEY);
        const salt = localStorage.getItem(PIN_SALT_KEY);
        if (!storedHash || !salt) return false;
        const hash = await hashPin(pin, salt);
        return hash === storedHash;
    }

    async function setupPin(pin) {
        const salt = generateSalt();
        const hash = await hashPin(pin, salt);
        localStorage.setItem(PIN_HASH_KEY, hash);
        localStorage.setItem(PIN_SALT_KEY, salt);
    }

    function unlockAdmin() {
        sessionStorage.setItem(PIN_VERIFIED_KEY, '1');
        document.getElementById('pinOverlay').classList.add('hidden');
        document.getElementById('adminContent').style.display = '';
    }

    function isSessionUnlocked() {
        return sessionStorage.getItem(PIN_VERIFIED_KEY) === '1';
    }

    // PIN setup form
    const pinSetup = document.getElementById('pinSetup');
    const pinEntry = document.getElementById('pinEntry');
    const pinSetup1 = document.getElementById('pinSetup1');
    const pinSetup2 = document.getElementById('pinSetup2');
    const pinSetupBtn = document.getElementById('pinSetupBtn');
    const pinSetupError = document.getElementById('pinSetupError');
    const pinEntryInput = document.getElementById('pinEntryInput');
    const pinEntryBtn = document.getElementById('pinEntryBtn');
    const pinEntryError = document.getElementById('pinEntryError');

    function initPinGate() {
        // If already unlocked this session, skip everything
        if (isSessionUnlocked()) {
            document.getElementById('pinOverlay').classList.add('hidden');
            document.getElementById('adminContent').style.display = '';
            return;
        }

        // Show the main container but keep overlay visible
        document.getElementById('adminContent').style.display = '';

        if (hasPinSetup()) {
            // Returning user — show PIN entry
            pinEntry.classList.remove('hidden');
            pinSetup.classList.add('hidden');
            setTimeout(() => pinEntryInput.focus(), 100);
        } else {
            // First time — show PIN setup
            pinSetup.classList.remove('hidden');
            pinEntry.classList.add('hidden');
            setTimeout(() => pinSetup1.focus(), 100);
        }
    }

    if (pinSetupBtn) {
        pinSetupBtn.addEventListener('click', async () => {
            const p1 = pinSetup1.value.trim();
            const p2 = pinSetup2.value.trim();
            pinSetupError.classList.add('hidden');

            if (p1.length < 4) {
                pinSetupError.textContent = 'PIN must be at least 4 digits.';
                pinSetupError.classList.remove('hidden');
                return;
            }
            if (p1.length > 6) {
                pinSetupError.textContent = 'PIN must be 6 digits or fewer.';
                pinSetupError.classList.remove('hidden');
                return;
            }
            if (p1 !== p2) {
                pinSetupError.textContent = 'PINs do not match.';
                pinSetupError.classList.remove('hidden');
                return;
            }

            await setupPin(p1);
            unlockAdmin();
        });

        // Submit on Enter in confirm field
        pinSetup2.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); pinSetupBtn.click(); }
        });
    }

    if (pinEntryBtn) {
        pinEntryBtn.addEventListener('click', async () => {
            const pin = pinEntryInput.value.trim();
            pinEntryError.classList.add('hidden');

            if (!pin) {
                pinEntryError.textContent = 'Please enter your PIN.';
                pinEntryError.classList.remove('hidden');
                return;
            }

            const valid = await verifyPin(pin);
            if (valid) {
                unlockAdmin();
            } else {
                pinEntryError.textContent = 'Incorrect PIN. Try again.';
                pinEntryError.classList.remove('hidden');
                pinEntryInput.value = '';
                pinEntryInput.focus();
            }
        });

        pinEntryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); pinEntryBtn.click(); }
        });
    }

    // ── DOM (restored after PIN) ────────────────────────────────────────────

    const form = document.getElementById('agencyForm');
    const jurisdictionType = document.getElementById('jurisdictionType');
    const jurisdictionName = document.getElementById('jurisdictionName');
    const agencyName = document.getElementById('agencyName');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const website = document.getElementById('website');
    const onlineReporting = document.getElementById('onlineReporting');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const agencyList = document.getElementById('agencyList');
    const searchInput = document.getElementById('searchAgencies');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // Stats
    const cityCount = document.getElementById('cityCount');
    const countyCount = document.getElementById('countyCount');
    const stateCount = document.getElementById('stateCount');
    const totalCount = document.getElementById('totalCount');

    // Default Agency
    const defaultName = document.getElementById('defaultName');
    const defaultContact = document.getElementById('defaultContact');
    const editDefaultBtn = document.getElementById('editDefaultBtn');

    // Modals
    const exportModal = document.getElementById('exportModal');
    const exportData = document.getElementById('exportData');
    const copyExportBtn = document.getElementById('copyExportBtn');
    const importModal = document.getElementById('importModal');
    const dropZone = document.getElementById('dropZone');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');

    let editingKey = null;
    let importPayload = null;

    // ── Pre-populate seed data ─────────────────────────────────────────────

    function seedIfEmpty() {
        const db = loadDB();
        const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) || '0', 10);

        // Skip if already seeded with current version
        if (storedVersion >= CURRENT_SEED_VERSION && Object.keys(db.agencies).length > 0) return;

        // All agencies from the reference database
        const seedData = {
            // ── Counties (Sheriff's Offices) ───────────────────────────────
            'county:Jefferson': {
                jurisdictionName: 'Jefferson', jurisdictionType: 'county',
                agencyName: 'Jefferson County Sheriff\'s Office',
                phone: '(409) 835-8411', address: '1001 Pearl St, Beaumont, TX 77701',
                website: 'https://www.co.jefferson.tx.us/sheriff', onlineReporting: ''
            },
            'county:Harris': {
                jurisdictionName: 'Harris', jurisdictionType: 'county',
                agencyName: 'Harris County Sheriff\'s Office',
                phone: '(713) 755-7628', address: '1200 Baker St, Houston, TX 77002',
                website: 'https://www.hcso.org', onlineReporting: ''
            },
            'county:Dallas': {
                jurisdictionName: 'Dallas', jurisdictionType: 'county',
                agencyName: 'Dallas County Sheriff\'s Department',
                phone: '(214) 749-8641', address: '133 N Industrial Blvd, Dallas, TX 75207',
                website: 'https://www.dallascounty.org/departments/sheriff', onlineReporting: ''
            },
            'county:Tarrant': {
                jurisdictionName: 'Tarrant', jurisdictionType: 'county',
                agencyName: 'Tarrant County Sheriff\'s Office',
                phone: '(817) 884-1213', address: '200 Taylor St, Fort Worth, TX 76196',
                website: 'https://www.tarrantcounty.com/en/sheriff', onlineReporting: ''
            },
            'county:Bexar': {
                jurisdictionName: 'Bexar', jurisdictionType: 'county',
                agencyName: 'Bexar County Sheriff\'s Office',
                phone: '(210) 335-6000', address: '200 N Comal St, San Antonio, TX 78207',
                website: 'https://www.bexar.org/1250/Sheriffs-Office', onlineReporting: ''
            },
            'county:Travis': {
                jurisdictionName: 'Travis', jurisdictionType: 'county',
                agencyName: 'Travis County Sheriff\'s Office',
                phone: '(512) 854-9770', address: '5555 Airport Blvd, Austin, TX 78751',
                website: 'https://www.tcso.org', onlineReporting: ''
            },
            'county:Collin': {
                jurisdictionName: 'Collin', jurisdictionType: 'county',
                agencyName: 'Collin County Sheriff\'s Office',
                phone: '(972) 547-5100', address: '4300 Community Ave, McKinney, TX 75071',
                website: 'https://www.collincountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Denton': {
                jurisdictionName: 'Denton', jurisdictionType: 'county',
                agencyName: 'Denton County Sheriff\'s Office',
                phone: '(940) 349-1600', address: '127 N Woodrow Ln, Denton, TX 76205',
                website: 'https://www.dentoncounty.gov/Departments/Sheriff', onlineReporting: ''
            },
            'county:Fort Bend': {
                jurisdictionName: 'Fort Bend', jurisdictionType: 'county',
                agencyName: 'Fort Bend County Sheriff\'s Office',
                phone: '(281) 341-4665', address: '1410 Ransom Rd, Richmond, TX 77469',
                website: 'https://www.fbcso.org', onlineReporting: ''
            },
            'county:Williamson': {
                jurisdictionName: 'Williamson', jurisdictionType: 'county',
                agencyName: 'Williamson County Sheriff\'s Office',
                phone: '(512) 943-1300', address: '508 S Rock St, Georgetown, TX 78626',
                website: 'https://www.wilco.org/Departments/Sheriff', onlineReporting: ''
            },
            'county:Hidalgo': {
                jurisdictionName: 'Hidalgo', jurisdictionType: 'county',
                agencyName: 'Hidalgo County Sheriff\'s Office',
                phone: '(956) 383-8114', address: '100 N Closner Blvd, Edinburg, TX 78539',
                website: 'https://www.hidalgocounty.us/269/Sheriffs-Office', onlineReporting: ''
            },
            'county:El Paso': {
                jurisdictionName: 'El Paso', jurisdictionType: 'county',
                agencyName: 'El Paso County Sheriff\'s Office',
                phone: '(915) 538-2008', address: '3850 E Paisano Dr, El Paso, TX 79905',
                website: 'https://www.epcounty.com/sheriff', onlineReporting: ''
            },
            'county:Nueces': {
                jurisdictionName: 'Nueces', jurisdictionType: 'county',
                agencyName: 'Nueces County Sheriff\'s Office',
                phone: '(361) 887-2222', address: '901 Leopard St, Corpus Christi, TX 78401',
                website: 'https://www.nuecesco.com/sheriff', onlineReporting: ''
            },
            'county:Lubbock': {
                jurisdictionName: 'Lubbock', jurisdictionType: 'county',
                agencyName: 'Lubbock County Sheriff\'s Office',
                phone: '(806) 775-1400', address: '916 Main St, Lubbock, TX 79401',
                website: 'https://www.lubbockcounty.gov/departments/sheriff', onlineReporting: ''
            },
            'county:Galveston': {
                jurisdictionName: 'Galveston', jurisdictionType: 'county',
                agencyName: 'Galveston County Sheriff\'s Office',
                phone: '(409) 766-2322', address: '5600 39th St, Dickinson, TX 77539',
                website: 'https://www.galvestoncountysheriff.org', onlineReporting: ''
            },
            'county:Montgomery': {
                jurisdictionName: 'Montgomery', jurisdictionType: 'county',
                agencyName: 'Montgomery County Sheriff\'s Office',
                phone: '(936) 760-5800', address: '100 Community Center Dr, Conroe, TX 77301',
                website: 'https://www.mctxsheriff.org', onlineReporting: ''
            },
            'county:Brazoria': {
                jurisdictionName: 'Brazoria', jurisdictionType: 'county',
                agencyName: 'Brazoria County Sheriff\'s Office',
                phone: '(979) 864-2392', address: '111 E Locust St, Angleton, TX 77515',
                website: 'https://www.brazoriacountysheriff.org', onlineReporting: ''
            },
            'county:Bell': {
                jurisdictionName: 'Bell', jurisdictionType: 'county',
                agencyName: 'Bell County Sheriff\'s Office',
                phone: '(254) 933-5412', address: '1201 Huey Bratcher Rd, Belton, TX 76513',
                website: 'https://www.bellcountytx.com/departments/sheriff', onlineReporting: ''
            },
            'county:McLennan': {
                jurisdictionName: 'McLennan', jurisdictionType: 'county',
                agencyName: 'McLennan County Sheriff\'s Office',
                phone: '(254) 757-5049', address: '3121 E Loop 340, Waco, TX 76705',
                website: 'https://www.mclennancountytx.gov/departments/sheriff', onlineReporting: ''
            },
            'county:Cameron': {
                jurisdictionName: 'Cameron', jurisdictionType: 'county',
                agencyName: 'Cameron County Sheriff\'s Office',
                phone: '(956) 554-6700', address: '7300 Old Alice Rd, Olmito, TX 78575',
                website: 'https://www.cameroncountysheriff.org', onlineReporting: ''
            },
            'county:Webb': {
                jurisdictionName: 'Webb', jurisdictionType: 'county',
                agencyName: 'Webb County Sheriff\'s Office',
                phone: '(956) 415-2878', address: '1110 Victoria St, Laredo, TX 78040',
                website: 'https://www.webbcountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Orange': {
                jurisdictionName: 'Orange', jurisdictionType: 'county',
                agencyName: 'Orange County Sheriff\'s Office',
                phone: '(409) 883-2612', address: '205 S Border St, Orange, TX 77630',
                website: 'https://ocsheriffsoffice.com/', onlineReporting: ''
            },
            'county:Smith': {
                jurisdictionName: 'Smith', jurisdictionType: 'county',
                agencyName: 'Smith County Sheriff\'s Office',
                phone: '(903) 566-6600', address: '227 N Spring Ave, Tyler, TX 75702',
                website: 'https://www.smith-county.com/sheriff', onlineReporting: ''
            },
            'county:Brazos': {
                jurisdictionName: 'Brazos', jurisdictionType: 'county',
                agencyName: 'Brazos County Sheriff\'s Office',
                phone: '(979) 361-4900', address: '1755 Briarcrest Dr, Bryan, TX 77802',
                website: 'https://www.brazoscountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Hardin': {
                jurisdictionName: 'Hardin', jurisdictionType: 'county',
                agencyName: 'Hardin County Sheriff\'s Office',
                phone: '(409) 246-5100', address: '300 Monroe St, Kountze, TX 77625',
                website: 'https://www.hardincountytx.gov/sheriff', onlineReporting: ''
            },
            'county:Liberty': {
                jurisdictionName: 'Liberty', jurisdictionType: 'county',
                agencyName: 'Liberty County Sheriff\'s Office',
                phone: '(936) 336-4513', address: '2400 Canyon Dr, Liberty, TX 77575',
                website: 'https://www.libertycountytx.com/sheriff', onlineReporting: ''
            },
            'county:Walker': {
                jurisdictionName: 'Walker', jurisdictionType: 'county',
                agencyName: 'Walker County Sheriff\'s Office',
                phone: '(936) 435-2400', address: '1100 University Ave, Huntsville, TX 77340',
                website: 'https://www.walkercotx.org/sheriff', onlineReporting: ''
            },

            // ── Cities (Police Departments) ────────────────────────────────
            'city:Port Arthur': {
                jurisdictionName: 'Port Arthur', jurisdictionType: 'city',
                agencyName: 'Port Arthur Police Department',
                phone: '(409) 983-8600', address: '645 4th St, Port Arthur, TX 77640',
                website: 'https://www.portarthurtx.gov/394/Police-Department', onlineReporting: ''
            },
            'city:Port Neches': {
                jurisdictionName: 'Port Neches', jurisdictionType: 'city',
                agencyName: 'Port Neches Police Department',
                phone: '(409) 722-1421', address: '1201 Merriman St, Port Neches, TX 77651',
                website: 'https://www.ci.port-neches.tx.us/departments/police_department/index.php', onlineReporting: ''
            },
            'city:Nederland': {
                jurisdictionName: 'Nederland', jurisdictionType: 'city',
                agencyName: 'Nederland Police Department',
                phone: '(409) 722-4965', address: '1400 Boston Ave, Nederland, TX 77627',
                website: 'https://www.ci.nederland.tx.us/page/police-main', onlineReporting: ''
            },
            'city:Groves': {
                jurisdictionName: 'Groves', jurisdictionType: 'city',
                agencyName: 'Groves Police Department',
                phone: '(409) 962-0244', address: '4201 Main Ave, Groves, TX 77619',
                website: 'https://www.cigrovestx.com/page/police.home', onlineReporting: ''
            },
            'city:Orange': {
                jurisdictionName: 'Orange', jurisdictionType: 'city',
                agencyName: 'Orange Police Department',
                phone: '(409) 883-1026', address: '1212 W Park Ave, Orange, TX 77630',
                website: 'https://www.orangetexas.net/police', onlineReporting: ''
            },
            'city:Vidor': {
                jurisdictionName: 'Vidor', jurisdictionType: 'city',
                agencyName: 'Vidor Police Department',
                phone: '(409) 769-4561', address: '695 East Railroad, Vidor, TX 77662',
                website: 'https://www.vidortx.com/police', onlineReporting: ''
            },
            'city:Bridge City': {
                jurisdictionName: 'Bridge City', jurisdictionType: 'city',
                agencyName: 'Bridge City Police Department',
                phone: '(409) 735-4503', address: '260 Raceway Dr, Bridge City, TX 77611',
                website: 'https://www.bridgecitytx.com/police', onlineReporting: ''
            },
            'city:West Orange': {
                jurisdictionName: 'West Orange', jurisdictionType: 'city',
                agencyName: 'West Orange Police Department',
                phone: '(409) 883-4661', address: '2700 Western Ave, West Orange, TX 77630',
                website: 'https://www.westorangetx.com/police', onlineReporting: ''
            },
            'city:Pinehurst': {
                jurisdictionName: 'Pinehurst', jurisdictionType: 'city',
                agencyName: 'Pinehurst Police Department',
                phone: '(409) 886-4111', address: '3730 Magnolia St, Pinehurst, TX 77362',
                website: 'https://www.pinehurstcity.com/police', onlineReporting: ''
            },
            'city:Silsbee': {
                jurisdictionName: 'Silsbee', jurisdictionType: 'city',
                agencyName: 'Silsbee Police Department',
                phone: '(409) 385-3714', address: '1104 N 5th St, Silsbee, TX 77656',
                website: 'https://www.cityofsilsbee.com/city-services/police-department/', onlineReporting: ''
            },
            'city:Lumberton': {
                jurisdictionName: 'Lumberton', jurisdictionType: 'city',
                agencyName: 'Lumberton Police Department',
                phone: '(409) 755-2650', address: '120 E Chance Cutoff A, Lumberton, TX 77657',
                website: 'https://cityoflumberton.com/lumberton-police-department-2/', onlineReporting: ''
            },
            'city:Kountze': {
                jurisdictionName: 'Kountze', jurisdictionType: 'city',
                agencyName: 'Kountze Police Department',
                phone: '(409) 246-5185', address: '306 E 4th St, Kountze, TX 77625',
                website: 'https://www.cityofkountze.com/police', onlineReporting: ''
            },
            'city:Sour Lake': {
                jurisdictionName: 'Sour Lake', jurisdictionType: 'city',
                agencyName: 'Sour Lake Police Department',
                phone: '(409) 287-3664', address: '100 W Crockett St, Sour Lake, TX 77659',
                website: 'https://www.cityofsourlake.com/police', onlineReporting: ''
            },
            'city:Liberty': {
                jurisdictionName: 'Liberty', jurisdictionType: 'city',
                agencyName: 'Liberty Police Department',
                phone: '(936) 336-3684', address: '1829 Sam Houston St, Liberty, TX 77575',
                website: 'https://www.cityofliberty.org/police', onlineReporting: ''
            },
            'city:Dayton': {
                jurisdictionName: 'Dayton', jurisdictionType: 'city',
                agencyName: 'Dayton Police Department',
                phone: '(936) 258-2642', address: '801 S Cleveland St, Dayton, TX 77535',
                website: 'https://www.cityofdayton.net/police', onlineReporting: ''
            },
            'city:Cleveland': {
                jurisdictionName: 'Cleveland', jurisdictionType: 'city',
                agencyName: 'Cleveland Police Department',
                phone: '(281) 592-2667', address: '907 E Houston St, Cleveland, TX 77327',
                website: 'https://www.clevelandtexas.com/police', onlineReporting: ''
            },
            'city:Huntsville': {
                jurisdictionName: 'Huntsville', jurisdictionType: 'city',
                agencyName: 'Huntsville Police Department',
                phone: '(936) 291-5480', address: '815 11th St, Huntsville, TX 77340',
                website: 'https://www.huntsvilletx.gov/police', onlineReporting: ''
            },
            'city:Conroe': {
                jurisdictionName: 'Conroe', jurisdictionType: 'city',
                agencyName: 'Conroe Police Department',
                phone: '(936) 522-3200', address: '601 N Main St, Conroe, TX 77301',
                website: 'https://www.cityofconroe.org/police', onlineReporting: ''
            },
            'city:The Woodlands': {
                jurisdictionName: 'The Woodlands', jurisdictionType: 'city',
                agencyName: 'The Woodlands Township Police Department',
                phone: '(281) 210-3800', address: '2801 Technology Forest Blvd, The Woodlands, TX 77381',
                website: 'https://www.thewoodlandstownship-tx.gov/police', onlineReporting: ''
            },
            'city:Magnolia': {
                jurisdictionName: 'Magnolia', jurisdictionType: 'city',
                agencyName: 'Magnolia Police Department',
                phone: '(281) 356-7122', address: '18111 Buddy Riley Blvd, Magnolia, TX 77354',
                website: 'https://www.cityofmagnolia.com/police', onlineReporting: ''
            },
            'city:Tomball': {
                jurisdictionName: 'Tomball', jurisdictionType: 'city',
                agencyName: 'Tomball Police Department',
                phone: '(281) 290-1011', address: '401 Market St, Tomball, TX 77375',
                website: 'https://www.tomballtx.gov/police', onlineReporting: ''
            },
            'city:Spring': {
                jurisdictionName: 'Spring', jurisdictionType: 'city',
                agencyName: 'Spring Police Department',
                phone: '(281) 353-9505', address: '1327 Spring Cypress Rd, Spring, TX 77373',
                website: 'https://www.springtx.gov/police', onlineReporting: ''
            },
            'city:Humble': {
                jurisdictionName: 'Humble', jurisdictionType: 'city',
                agencyName: 'Humble Police Department',
                phone: '(281) 446-2327', address: '114 W Higgins St, Humble, TX 77338',
                website: 'https://www.cityofhumble.org/police', onlineReporting: ''
            },
            'city:Kingwood': {
                jurisdictionName: 'Kingwood', jurisdictionType: 'city',
                agencyName: 'Kingwood Police Department',
                phone: '(281) 358-3200', address: '22026 Northpark Dr, Kingwood, TX 77339',
                website: 'https://www.kingwoodtx.gov/police', onlineReporting: ''
            },
            'city:Houston': {
                jurisdictionName: 'Houston', jurisdictionType: 'city',
                agencyName: 'Houston Police Department',
                phone: '(713) 884-3131', address: '1200 Travis St, Houston, TX 77002',
                website: 'https://www.houstontx.gov/police', onlineReporting: 'https://www.houstontx.gov/police/online_report.htm'
            },
            'city:San Antonio': {
                jurisdictionName: 'San Antonio', jurisdictionType: 'city',
                agencyName: 'San Antonio Police Department',
                phone: '(210) 207-7273', address: '315 S Santa Rosa Ave, San Antonio, TX 78207',
                website: 'https://www.sanantonio.gov/SAPD', onlineReporting: ''
            },
            'city:Dallas': {
                jurisdictionName: 'Dallas', jurisdictionType: 'city',
                agencyName: 'Dallas Police Department',
                phone: '(214) 671-4282', address: '1400 S Lamar St, Dallas, TX 75215',
                website: 'https://www.dallaspolice.net', onlineReporting: ''
            },
            'city:Austin': {
                jurisdictionName: 'Austin', jurisdictionType: 'city',
                agencyName: 'Austin Police Department',
                phone: '(512) 974-5000', address: '715 E 8th St, Austin, TX 78701',
                website: 'https://www.austintexas.gov/department/police', onlineReporting: 'https://www.austintexas.gov/page/file-police-report-online'
            },
            'city:Fort Worth': {
                jurisdictionName: 'Fort Worth', jurisdictionType: 'city',
                agencyName: 'Fort Worth Police Department',
                phone: '(817) 392-4222', address: '350 W Belknap St, Fort Worth, TX 76102',
                website: 'https://www.fortworthtexas.gov/departments/police', onlineReporting: ''
            },
            'city:El Paso': {
                jurisdictionName: 'El Paso', jurisdictionType: 'city',
                agencyName: 'El Paso Police Department',
                phone: '(915) 212-4400', address: '911 N Raynor St, El Paso, TX 79901',
                website: 'https://www.elpasotexas.gov/police', onlineReporting: ''
            },
            'city:Arlington': {
                jurisdictionName: 'Arlington', jurisdictionType: 'city',
                agencyName: 'Arlington Police Department',
                phone: '(817) 459-5700', address: '620 W Division St, Arlington, TX 76011',
                website: 'https://www.arlingtontx.gov/city_hall/departments/police', onlineReporting: ''
            },
            'city:Corpus Christi': {
                jurisdictionName: 'Corpus Christi', jurisdictionType: 'city',
                agencyName: 'Corpus Christi Police Department',
                phone: '(361) 886-2600', address: '321 John Sartain St, Corpus Christi, TX 78401',
                website: 'https://www.cctexas.com/departments/police', onlineReporting: ''
            },
            'city:Plano': {
                jurisdictionName: 'Plano', jurisdictionType: 'city',
                agencyName: 'Plano Police Department',
                phone: '(972) 424-5678', address: '909 14th St, Plano, TX 75074',
                website: 'https://www.plano.gov/1183/Police', onlineReporting: ''
            },
            'city:Lubbock': {
                jurisdictionName: 'Lubbock', jurisdictionType: 'city',
                agencyName: 'Lubbock Police Department',
                phone: '(806) 775-2865', address: '916 Texas Ave, Lubbock, TX 79401',
                website: 'https://www.mylubbock.us/departments/police', onlineReporting: ''
            },
            'city:Beaumont': {
                jurisdictionName: 'Beaumont', jurisdictionType: 'city',
                agencyName: 'Beaumont Police Department',
                phone: '(409) 832-1234', address: '255 College St, Beaumont, TX 77701',
                website: 'https://www.beaumonttexas.gov/departments/police', onlineReporting: ''
            },
            'city:Galveston': {
                jurisdictionName: 'Galveston', jurisdictionType: 'city',
                agencyName: 'Galveston Police Department',
                phone: '(409) 765-3702', address: '823 Rosenberg Ave, Galveston, TX 77550',
                website: 'https://www.galvestontx.gov/police', onlineReporting: ''
            },
            'city:Tyler': {
                jurisdictionName: 'Tyler', jurisdictionType: 'city',
                agencyName: 'Tyler Police Department',
                phone: '(903) 531-1000', address: '405 Martin Walker Dr, Tyler, TX 75702',
                website: 'https://www.cityoftyler.org/departments/police', onlineReporting: ''
            },
            'city:Waco': {
                jurisdictionName: 'Waco', jurisdictionType: 'city',
                agencyName: 'Waco Police Department',
                phone: '(254) 750-7500', address: '3115 Pine Ave, Waco, TX 76708',
                website: 'https://www.waco-texas.com/departments/police', onlineReporting: ''
            },
            'city:Brownsville': {
                jurisdictionName: 'Brownsville', jurisdictionType: 'city',
                agencyName: 'Brownsville Police Department',
                phone: '(956) 548-7000', address: '600 E Jackson St, Brownsville, TX 78520',
                website: 'https://www.cob.us/departments/police', onlineReporting: ''
            },
            'city:Laredo': {
                jurisdictionName: 'Laredo', jurisdictionType: 'city',
                agencyName: 'Laredo Police Department',
                phone: '(956) 795-2800', address: '4712 Maher Ave, Laredo, TX 78041',
                website: 'https://www.cityoflaredo.com/police', onlineReporting: ''
            },
            'city:College Station': {
                jurisdictionName: 'College Station', jurisdictionType: 'city',
                agencyName: 'College Station Police Department',
                phone: '(979) 764-3600', address: '1100 Krenek Tap Rd, College Station, TX 77840',
                website: 'https://www.cstx.gov/departments/police', onlineReporting: ''
            },
            'city:Bryan': {
                jurisdictionName: 'Bryan', jurisdictionType: 'city',
                agencyName: 'Bryan Police Department',
                phone: '(979) 209-5300', address: '303 E 29th St, Bryan, TX 77803',
                website: 'https://www.bryantx.gov/departments/police', onlineReporting: ''
            }
        };

        db.agencies = seedData;
        db.defaultAgency = {
            agencyName: 'Texas Department of Public Safety',
            phone: '(512) 463-2000',
            address: '5805 N Lamar Blvd, Austin, TX 78752',
            website: 'https://www.dps.texas.gov/'
        };

        saveDB(db);
        localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION.toString());
    }

    // ── LocalStorage Helpers ────────────────────────────────────────────────

    function loadDB() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            return raw ? JSON.parse(raw) : { agencies: {} };
        } catch {
            return { agencies: {} };
        }
    }

    function saveDB(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    function loadDefault() {
        try {
            const raw = localStorage.getItem(DEFAULT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveDefault(data) {
        localStorage.setItem(DEFAULT_KEY, JSON.stringify(data));
    }

    // ── List Rendering ──────────────────────────────────────────────────────

    function renderList(filter = '') {
        const db = loadDB();
        const entries = Object.entries(db.agencies);

        const filtered = filter
            ? entries.filter(([, v]) =>
                v.agencyName.toLowerCase().includes(filter) ||
                v.jurisdictionName.toLowerCase().includes(filter) ||
                v.jurisdictionType.toLowerCase().includes(filter))
            : entries;

        // Sort: cities first, then counties, then state, alphabetical within each
        filtered.sort((a, b) => {
            const typeOrder = { city: 0, county: 1, state: 2 };
            const typeA = typeOrder[a[1].jurisdictionType] ?? 3;
            const typeB = typeOrder[b[1].jurisdictionType] ?? 3;
            if (typeA !== typeB) return typeA - typeB;
            return a[1].jurisdictionName.localeCompare(b[1].jurisdictionName);
        });

        if (filtered.length === 0) {
            agencyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>${filter ? 'No agencies match your search.' : 'No agencies on file yet. Add one above!'}</p>
                </div>`;
        } else {
            agencyList.innerHTML = filtered.map(([key, agency]) => {
                const icon = agency.jurisdictionType === 'city' ? 'fa-city'
                           : agency.jurisdictionType === 'county' ? 'fa-flag'
                           : 'fa-star';
                const typeLabel = agency.jurisdictionType === 'city' ? 'City Police'
                                : agency.jurisdictionType === 'county' ? 'County Sheriff'
                                : 'State Police';

                return `
                    <div class="agency-item">
                        <div class="agency-info">
                            <h3>${agency.agencyName}</h3>
                            <div class="jurisdiction-type">
                                <i class="fas ${icon}"></i>
                                ${typeLabel} &middot; ${agency.jurisdictionName}
                            </div>
                            <div class="agency-contact">
                                ${agency.phone || 'No phone'} &middot;
                                ${agency.address || 'No address'}
                            </div>
                        </div>
                        <div class="agency-actions">
                            <button class="btn btn-primary" onclick="window.__editAgency('${key}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-danger" onclick="window.__deleteAgency('${key}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>`;
            }).join('');
        }

        // Update stats
        const cities = entries.filter(([, v]) => v.jurisdictionType === 'city').length;
        const counties = entries.filter(([, v]) => v.jurisdictionType === 'county').length;
        const states = entries.filter(([, v]) => v.jurisdictionType === 'state').length;
        cityCount.textContent = cities;
        countyCount.textContent = counties;
        stateCount.textContent = states;
        totalCount.textContent = entries.length;
    }

    function renderDefault() {
        const def = loadDefault();
        if (def && def.agencyName) {
            defaultName.textContent = def.agencyName;
            defaultContact.textContent = def.phone ? `${def.phone} · ${def.address || ''}` : 'No contact info';
        } else {
            defaultName.textContent = 'No default agency configured';
            defaultContact.textContent = 'Add Texas DPS contact information';
        }
    }

    // ── Form Helpers ────────────────────────────────────────────────────────

    function clearForm() {
        form.reset();
        editingKey = null;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Agency';
    }

    function populateForm(key) {
        const db = loadDB();
        const agency = db.agencies[key];
        if (!agency) return;

        editingKey = key;
        jurisdictionType.value = agency.jurisdictionType;
        jurisdictionName.value = agency.jurisdictionName;
        agencyName.value = agency.agencyName;
        phone.value = agency.phone;
        address.value = agency.address;
        website.value = agency.website;
        onlineReporting.value = agency.onlineReporting || '';

        saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Agency';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── Event Handlers ──────────────────────────────────────────────────────

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const key = `${jurisdictionType.value}:${jurisdictionName.value.trim()}`;
        const data = {
            jurisdictionType: jurisdictionType.value,
            jurisdictionName: jurisdictionName.value.trim(),
            agencyName: agencyName.value.trim(),
            phone: phone.value.trim(),
            address: address.value.trim(),
            website: website.value.trim(),
            onlineReporting: onlineReporting.value.trim()
        };

        const db = loadDB();
        db.agencies[key] = data;
        saveDB(db);

        clearForm();
        renderList(searchInput.value.toLowerCase().trim());
    });

    clearBtn.addEventListener('click', clearForm);

    searchInput.addEventListener('input', () => {
        renderList(searchInput.value.toLowerCase().trim());
    });

    // Export
    exportBtn.addEventListener('click', () => {
        const db = loadDB();
        const def = loadDefault();
        const payload = {
            agencies: db.agencies,
            defaultAgency: def,
            exportedAt: new Date().toISOString()
        };
        exportData.value = JSON.stringify(payload, null, 2);
        exportModal.classList.remove('hidden');
    });

    copyExportBtn.addEventListener('click', () => {
        exportData.select();
        document.execCommand('copy');
        copyExportBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            copyExportBtn.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard';
        }, 2000);
    });

    // Import
    importBtn.addEventListener('click', () => {
        importModal.classList.remove('hidden');
        importPayload = null;
        confirmImportBtn.disabled = true;
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        handleImportFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleImportFile(e.dataTransfer.files[0]);
        }
    });

    function handleImportFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.agencies) {
                    importPayload = data;
                    confirmImportBtn.disabled = false;
                    dropZone.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <p><strong>${Object.keys(data.agencies).length} agencies</strong> ready to import</p>`;
                } else {
                    alert('Invalid file format. Expected JSON with "agencies" key.');
                }
            } catch {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    }

    confirmImportBtn.addEventListener('click', () => {
        if (!importPayload) return;
        saveDB({ agencies: importPayload.agencies });
        if (importPayload.defaultAgency) {
            saveDefault(importPayload.defaultAgency);
        }
        importModal.classList.add('hidden');
        renderList();
        renderDefault();
    });

    cancelImportBtn.addEventListener('click', () => {
        importModal.classList.add('hidden');
        importPayload = null;
    });

    // Default Agency
    editDefaultBtn.addEventListener('click', () => {
        const current = loadDefault() || {};
        const name = prompt('Agency name:', current.agencyName || 'Texas Department of Public Safety');
        if (!name) return;
        const phoneVal = prompt('Phone number:', current.phone || '(512) 424-2000');
        if (phoneVal === null) return;
        const addr = prompt('Address:', current.address || '5805 N Lamar Blvd, Austin, TX 78752');
        if (addr === null) return;
        const web = prompt('Website:', current.website || 'https://www.dps.texas.gov/');
        if (web === null) return;

        saveDefault({
            agencyName: name,
            phone: phoneVal,
            address: addr,
            website: web
        });
        renderDefault();
    });

    // Global handlers for list buttons
    window.__editAgency = (key) => populateForm(key);
    window.__deleteAgency = (key) => {
        if (!confirm('Are you sure you want to delete this agency?')) return;
        const db = loadDB();
        delete db.agencies[key];
        saveDB(db);
        renderList(searchInput.value.toLowerCase().trim());
    };

    // Modal close
    document.querySelectorAll('.modal-close').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });

    // Close modal on background click
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });

    // ── Init ────────────────────────────────────────────────────────────────
    seedIfEmpty();
    renderList();
    renderDefault();

    // PIN gate — runs after everything else is wired up
    initPinGate();

})();
