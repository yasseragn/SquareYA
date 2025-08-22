document.addEventListener("DOMContentLoaded", function() {
    // !!! === قم بلصق رابط الـ API الخاص بك هنا (من Google Script) === !!!
    const apiUrl = 'https://script.google.com/macros/s/AKfycbwXDMnAJxPSWg3UdyuCJaXZDHCYOkHtqvn-BOPRrdcq-no3HtzYfM-aTqfbJPPBiqE/exec'; 
    
    const loader = document.getElementById('loader');
    const cardsGrid = document.getElementById('cards-grid');
    let currencyRates = {};
    const currencies = [
        { code: 'eur', name: 'يورو', major: true }, { code: 'usd', name: 'دولار أمريكي', major: true },
        { code: 'cad', name: 'دولار كندي', major: false }, { code: 'gbp', name: 'جنيه استرليني', major: false },
        { code: 'chf', name: 'فرنك سويسري', major: false }, { code: 'try', name: 'ليرة تركية', major: false },
        { code: 'cny', name: 'يوان صيني', major: false }, { code: 'aed', name: 'درهم إماراتي', major: false },
        { code: 'sar', name: 'ريال سعودي', major: false }, { code: 'tnd', name: 'دينار تونسي', major: false },
        { code: 'mad', name: 'درهم مغربي', major: false }
    ];

    const amountInput = document.getElementById('amount');
    const fromSelect = document.getElementById('from_currency');
    const toSelect = document.getElementById('to_currency');
    const swapButton = document.getElementById('swap_button');
    const resultAmountEl = document.getElementById('result_amount');
    const resultContainer = document.getElementById('converter_result');

    const animateCounter = (element, target) => {
        if (isNaN(target)) return;
        const duration = 1500; let start = null;
        const step = timestamp => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const currentValue = progress * target;
            element.textContent = currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (progress < 1) window.requestAnimationFrame(step);
            else element.textContent = target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        window.requestAnimationFrame(step);
    };

    const createCard = (currency, rates, delay) => {
        const isMajor = currency.major;
        const cardClass = isMajor ? 'currency-card major-card' : 'currency-card';
        const flagCode = currency.code === 'gbp' ? 'gb' : (currency.code === 'eur' ? 'eu' : currency.code.substring(0, 2));
        const buyPrice = rates.buy || 0;
        const sellPrice = rates.sell || 0;
        const buyLabel = `شراء (1 ${currency.name})`;
        const sellLabel = `بيع (1 ${currency.name})`;

        return `
            <div class="${cardClass}" style="animation-delay: ${delay}s;">
                <div class="card-header">
                    <img src="https://flagcdn.com/w80/${flagCode}.png" alt="${currency.name}">
                    <div><div class="card-title">${currency.name}</div><div class="card-code">${currency.code.toUpperCase()} / DZD</div></div>
                </div>
                <div class="card-prices">
                    <div class="price-box buy"><div class="price-label">${buyLabel}</div><div class="price-value price-buy" data-target="${buyPrice}">0.00</div></div>
                    <div class="price-box sell"><div class="price-label">${sellLabel}</div><div class="price-value price-sell" data-target="${sellPrice}">0.00</div></div>
                </div>
            </div>`;
    };
    
    const calculateConversion = () => {
        const amount = parseFloat(amountInput.value) || 0;
        const from = fromSelect.value;
        const to = toSelect.value;
        let result = 0;

        if (amount === 0) { resultAmountEl.textContent = '0.00'; return; }

        const fromRate = currencyRates[from];
        const toRate = currencyRates[to];

        if (!fromRate || !toRate) return;

        if (from === 'dzd') { result = amount / toRate.sell; } 
        else if (to === 'dzd') { result = amount * fromRate.buy; } 
        else { const amountInDzd = amount * fromRate.buy; result = amountInDzd / toRate.sell; }
        
        resultAmountEl.textContent = `${result.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${to.toUpperCase()}`;
        resultContainer.classList.add('show');
    };

    async function fetchAndDisplayData() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const prices = await response.json();
            if (prices.error) throw new Error(prices.details);

            currencyRates = { ...prices, dzd: { buy: 1, sell: 1 } };
            
            let cardHtml = ''; let adCounter = 0;
            currencies.forEach((currency, index) => {
                cardHtml += createCard(currency, prices[currency.code] || {}, index * 0.05);
                adCounter++;
                if (adCounter === 4 || adCounter === 8) {
                    cardHtml += '<div class="ads-container"><div class="ads-placeholder"><span>وحدة إعلانية مربعة</span><span class="ad-size">Medium Rectangle (300x250)</span></div></div>';
                }
            });
            cardsGrid.innerHTML = cardHtml;

            const optionsHtml = Object.keys(currencyRates).map(code => `<option value="${code}">${code.toUpperCase()}</option>`).join('');
            fromSelect.innerHTML = optionsHtml; toSelect.innerHTML = optionsHtml;
            fromSelect.value = 'eur'; toSelect.value = 'dzd';
            
            loader.style.display = 'none';
            cardsGrid.style.display = 'grid';

            calculateConversion();

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = +entry.target.dataset.target;
                        animateCounter(entry.target, target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.price-value').forEach(el => observer.observe(el));

        } catch (error) {
            console.error('Fetch error:', error);
            loader.textContent = 'فشل تحميل الأسعار. يرجى تحديث الصفحة.';
        }
    }

    [amountInput, fromSelect, toSelect].forEach(el => el.addEventListener('input', calculateConversion));
    swapButton.addEventListener('click', () => {
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
        calculateConversion();
    });

    fetchAndDisplayData();
});
