document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const algorithmSelect = document.getElementById('algorithm');
    const paramsDivs = {
        caesar: document.getElementById('params-caesar'),
        vigenere: document.getElementById('params-textkey'),
        xor: document.getElementById('params-textkey'),
        aes: document.getElementById('params-textkey'),
        rsa: document.getElementById('params-rsa')
    };
    
    const inputTextArea = document.getElementById('input-text');
    const outputTextArea = document.getElementById('output-text');
    const logDiv = document.getElementById('viz-log');
    
    // Viz Elements
    const vizSection = document.getElementById('viz-section');
    const vizTableHead = document.querySelector('#viz-table thead');
    const vizTableBody = document.querySelector('#viz-table tbody');
    const explanationText = document.getElementById('explanation-text');

    // === Event Listeners ===
    algorithmSelect.addEventListener('change', updateUI);
    document.getElementById('btn-encrypt').addEventListener('click', () => process('encrypt'));
    document.getElementById('btn-decrypt').addEventListener('click', () => process('decrypt'));
    document.getElementById('btn-rsa-gen').addEventListener('click', generateRSAKeys);

    // === UI Functions ===
    function updateUI() {
        const algo = algorithmSelect.value;
        document.querySelectorAll('.algo-params').forEach(el => el.classList.remove('active'));
        if (paramsDivs[algo]) {
            paramsDivs[algo].classList.add('active');
        } else {
            document.getElementById('params-textkey').classList.add('active');
        }
        vizSection.style.display = 'none'; // Скрываем таблицу при смене
        log(`Switched to algorithm: ${algo.toUpperCase()}`);
    }

    function log(msg, type = 'normal') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        if (type === 'highlight') entry.classList.add('log-highlight');
        if (type === 'error') entry.classList.add('log-error');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        entry.textContent = `[${time}] > ${msg}`;
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    function clearLog() {
        logDiv.innerHTML = '';
        log('Processing started...', 'highlight');
    }

    // === UNIVERSAL TABLE RENDERER ===
    function renderTable(headers, rows, explanation) {
        vizSection.style.display = 'block';
        
        // 1. Set Headers
        const headerRow = document.createElement('tr');
        headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; headerRow.appendChild(th); });
        vizTableHead.replaceChildren(headerRow);

        // 2. Set Explanation
        explanationText.innerHTML = explanation;

        // 3. Set Body
        vizTableBody.replaceChildren();
        rows.forEach(row => {
            let tr = document.createElement('tr');
            row.forEach((cell, i) => {
                const td = document.createElement('td');
                td.textContent = String(cell);
                if (i === 1) td.className = 'highlight-in';
                if (i === row.length - 1) td.className = 'highlight-out';
                tr.appendChild(td);
            });
            vizTableBody.appendChild(tr);
        });
    }

    // === ALGORITHM VISUALIZERS ===

    function vizCaesar(text, shift, isDecrypt) {
        const headers = ["#", "Input", "Pos", "Calculation", "Output"];
        const rows = [];
        const limit = Math.min(text.length, 50);

        for(let i=0; i<limit; i++) {
            let char = text[i];
            if (char.match(/[a-z]/i)) {
                const code = text.charCodeAt(i);
                const base = (code >= 65 && code <= 90) ? 65 : 97;
                const pos = code - base;
                let newPos = isDecrypt ? (pos - shift) % 26 : (pos + shift) % 26;
                if (newPos < 0) newPos += 26;
                
                const op = isDecrypt ? "-" : "+";
                const calc = `${pos} ${op} ${shift} mod 26 = ${newPos}`;
                const res = String.fromCharCode(newPos + base);
                rows.push([i, char, pos, calc, res]);
            } else {
                rows.push([i, char, "-", "Copied", char]);
            }
        }
        
        const expl = `
            <p>1. <b>Pos</b>: Alphabet position (A=0, B=1...).</p>
            <p>2. <b>Formula</b>: (Pos ${isDecrypt?'-':'+'} Shift) mod 26.</p>
        `;
        renderTable(headers, rows, expl);
    }

    function vizVigenere(text, key, isDecrypt) {
        const headers = ["#", "Input", "Key Char", "Calculation", "Output"];
        const rows = [];
        const limit = Math.min(text.length, 50);
        key = key.toLowerCase().replace(/[^a-z]/g, "");
        if(!key) return;

        let j = 0;
        for(let i=0; i<limit; i++) {
            let char = text[i];
            if (char.match(/[a-z]/i)) {
                const code = text.charCodeAt(i);
                const base = (code >= 65 && code <= 90) ? 65 : 97;
                const pos = code - base;
                
                let keyChar = key[j % key.length];
                let keyShift = keyChar.charCodeAt(0) - 97;
                
                let newPos = isDecrypt ? (pos - keyShift) : (pos + keyShift);
                newPos = ((newPos % 26) + 26) % 26; // Fix negative mod
                
                const op = isDecrypt ? "-" : "+";
                const calc = `${pos} ('${char}') ${op} ${keyShift} ('${keyChar}') = ${newPos}`;
                const res = String.fromCharCode(newPos + base);
                
                rows.push([i, char, keyChar, calc, res]);
                j++;
            } else {
                rows.push([i, char, "-", "Ignored", char]);
            }
        }
        const expl = `
            <p>1. <b>Vigenère</b> uses a text key. Each letter of the key determines the shift.</p>
            <p>2. <b>Formula</b>: (InputPos ${isDecrypt?'-':'+'} KeyPos) mod 26.</p>
        `;
        renderTable(headers, rows, expl);
    }

    function vizXOR(bytes, key, isDecrypt) {
        const headers = ["#", "Input byte", "Key byte", "Binary XOR", "Output byte"];
        const rows = [];
        const keyBytes = encode.encode(key);
        const limit = Math.min(bytes.length, 20);
        for(let i=0; i<limit; i++) {
            let charCode = bytes[i];
            let keyCode = keyBytes[i % keyBytes.length];
            let resCode = charCode ^ keyCode;
            
            let bin1 = charCode.toString(2).padStart(8,'0');
            let bin2 = keyCode.toString(2).padStart(8,'0');
            let bin3 = resCode.toString(2).padStart(8,'0');
            
            rows.push([i, `0x${charCode.toString(16).padStart(2,'0')}`, `0x${keyCode.toString(16).padStart(2,'0')}`, `${bin1} ^ ${bin2} = ${bin3}`, `0x${resCode.toString(16).padStart(2,'0')}`]);
        }
        const expl = `
            <p>1. <b>XOR</b> compares bits. If bits are different -> 1, same -> 0.</p>
            <p>2. Operation is symmetric: A ^ B = C, and C ^ B = A.</p>
        `;
        renderTable(headers, rows, expl);
    }

    function vizAES(text, key) {
        const headers = ["Этап", "Вход", "Операция", "Результат"];
        const rows = [["1", "Пароль", "PBKDF2 / SHA-256 / 250 000 итераций", "Ключ AES-256"],["2", "Случайные salt и IV", "AES-GCM", "Шифртекст с тегом целостности"]];
        
        const expl = `
            <p>Данные обрабатываются локально через Web Crypto API. Каждый запуск создаёт новые случайные salt и IV. Неверный пароль обнаруживается проверкой целостности GCM.</p>
        `;
        renderTable(headers, rows, expl);
    }

    function vizRSA(text, key, isDecrypt) {
        const headers = ["Этап", "Вход", "Операция", "Результат"];
        const rows = [["1", "UTF-8 сообщение", "RSA-OAEP с SHA-256", "Случайное дополнение"],["2", isDecrypt ? "Закрытый ключ" : "Открытый ключ", isDecrypt ? "Расшифрование" : "Шифрование", "Результат в Base64 / UTF-8"]];
        const expl = `
            <p>RSA-OAEP использует случайное дополнение и SHA-256. Открытым ключом шифруют короткое сообщение, закрытым — расшифровывают. Для больших данных используйте AES-GCM.</p>
        `;
        renderTable(headers, rows, expl);
    }


    // === LOGIC WRAPPERS ===

    function cipherCaesar(text, shift, decrypt = false) {
        vizCaesar(text, shift, decrypt); // CALL VIZ
        let result = "";
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char.match(/[a-z]/i)) {
                const code = text.charCodeAt(i);
                let base = (code >= 65 && code <= 90) ? 65 : 97;
                let offset = decrypt ? (26 - (shift % 26)) : shift;
                let newChar = String.fromCharCode(((code - base + offset) % 26) + base);
                result += newChar;
            } else {
                result += char;
            }
        }
        return result;
    }

    function cipherVigenere(text, key, decrypt = false) {
        if (!key || !/[a-z]/i.test(key)) throw new Error("Key must contain Latin letters");
        vizVigenere(text, key, decrypt); // CALL VIZ
        let result = "";
        key = key.toLowerCase().replace(/[^a-z]/g, "");
        let j = 0;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char.match(/[a-z]/i)) {
                const code = text.charCodeAt(i);
                let base = (code >= 65 && code <= 90) ? 65 : 97;
                let keyShift = key.charCodeAt(j % key.length) - 97;
                if (decrypt) keyShift = (26 - keyShift) % 26;
                let newChar = String.fromCharCode(((code - base + keyShift) % 26) + base);
                result += newChar;
                j++;
            } else {
                result += char;
            }
        }
        return result;
    }

    function cipherXOR(bytes, key) {
        if (!key) throw new Error("Key is required");
        const keyBytes = encode.encode(key);
        const result = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        return result;
    }

    const encode = new TextEncoder();
    const decode = new TextDecoder('utf-8', { fatal: true });
    const toBase64 = bytes => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
    const fromBase64 = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));
    async function cipherAES(text, password, decrypt = false) {
        if (password.length < 12) throw new Error("Use a passphrase of at least 12 characters");
        if (!crypto.subtle) throw new Error("Web Crypto requires a secure context (localhost or HTTPS)");
        vizAES(text, password);
        const payload = decrypt ? fromBase64(text) : null;
        if (decrypt && payload.length < 45) throw new Error("Invalid AES-GCM payload");
        const salt = decrypt ? payload.slice(0, 16) : crypto.getRandomValues(new Uint8Array(16));
        const iv = decrypt ? payload.slice(16, 28) : crypto.getRandomValues(new Uint8Array(12));
        const material = await crypto.subtle.importKey('raw', encode.encode(password), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
        if (decrypt) {
            try { return decode.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,payload.slice(28))); }
            catch { throw new Error("Wrong passphrase or damaged ciphertext"); }
        }
        const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encode.encode(text)));
        const result = new Uint8Array(28 + encrypted.length);
        result.set(salt); result.set(iv,16); result.set(encrypted,28);
        return toBase64(result);
    }
    const pem = (bytes, type) => '-----BEGIN ' + type + '-----\n' + toBase64(new Uint8Array(bytes)).match(/.{1,64}/g).join('\n') + '\n-----END ' + type + '-----';
    const unpem = text => fromBase64(text.replace(/-----[^-]+-----|\s/g,''));
    async function cipherRSA(text, decrypt = false) {
        if (!crypto.subtle) throw new Error("Web Crypto requires a secure context (localhost or HTTPS)");
        vizRSA(text, null, decrypt);
        if (decrypt) {
            const privatePem = document.getElementById('rsa-priv').value;
            if (!privatePem) throw new Error("Generate a keypair first");
            const key = await crypto.subtle.importKey('pkcs8',unpem(privatePem),{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
            try { return decode.decode(await crypto.subtle.decrypt({name:'RSA-OAEP'},key,fromBase64(text))); }
            catch { throw new Error("RSA decryption failed"); }
        }
        const publicPem = document.getElementById('rsa-pub').value;
        if (!publicPem) throw new Error("Generate a keypair first");
        const key = await crypto.subtle.importKey('spki',unpem(publicPem),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
        if (encode.encode(text).length > 190) throw new Error("RSA-OAEP is for short messages (up to 190 UTF-8 bytes); use AES-GCM for longer data");
        return toBase64(new Uint8Array(await crypto.subtle.encrypt({name:'RSA-OAEP'},key,encode.encode(text))));
    }
    async function generateRSAKeys() {
        try {
            if (!crypto.subtle) throw new Error("Web Crypto requires localhost or HTTPS");
            log("Generating RSA-OAEP 2048-bit keypair…", "highlight");
            const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
            document.getElementById('rsa-pub').value = pem(await crypto.subtle.exportKey('spki',pair.publicKey),'PUBLIC KEY');
            document.getElementById('rsa-priv').value = pem(await crypto.subtle.exportKey('pkcs8',pair.privateKey),'PRIVATE KEY');
            log("Keypair generated in this browser. Keep the private key private.", "highlight");
        } catch (error) { log(error.message, "error"); }
    }

    // === Main Process ===
    async function process(action) {
        clearLog();
        const algo = algorithmSelect.value;
        const text = inputTextArea.value;
        
        if (!text) {
            log("Error: Input text is empty", "error");
            return;
        }

        let result = "";

        try {
            switch(algo) {
                case 'caesar':
                    const shift = parseInt(document.getElementById('caesar-shift').value);
                    result = cipherCaesar(text, shift, action === 'decrypt');
                    break;
                case 'vigenere':
                    result = cipherVigenere(text, document.getElementById('text-key').value, action === 'decrypt');
                    break;
                case 'xor':
                    const xKey = document.getElementById('text-key').value;
                    if (!xKey) throw new Error("Key is required");
                    if(action === 'encrypt') {
                        const plainBytes = encode.encode(text);
                        vizXOR(plainBytes, xKey, false);
                        result = toBase64(cipherXOR(plainBytes, xKey));
                    } else {
                        const cipherBytes = fromBase64(text);
                        vizXOR(cipherBytes, xKey, true);
                        result = decode.decode(cipherXOR(cipherBytes, xKey));
                    }
                    break;
                case 'aes':
                    result = await cipherAES(text, document.getElementById('text-key').value, action === 'decrypt');
                    break;
                case 'rsa':
                    result = await cipherRSA(text, action === 'decrypt');
                    break;
            }
            outputTextArea.value = result;
            log(`Operation ${action.toUpperCase()} completed.`, 'highlight');
        } catch (e) {
            log(`Error: ${e.message}`, 'error');
            outputTextArea.value = "ERROR";
        }
    }

    updateUI();
});

