if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const viewSections = document.querySelectorAll('.view-section');

  const switchView = (targetId, clickedBtn) => {
    viewSections.forEach(sec => sec.classList.add('hidden-view'));
    document.getElementById(targetId).classList.remove('hidden-view');

    navBtns.forEach(btn => {
      // mobile active state styling
      if (btn.classList.contains('bg-[#b7102a]')) {
         btn.classList.remove('bg-[#b7102a]', 'text-white', 'rounded-[32px]', 'py-2');
         btn.classList.add('text-[#191c1f]', 'opacity-40');
      }
      
      // desktop state inline styling
      btn.classList.remove('nav-active');
      if (btn.getAttribute('data-target') === targetId) {
        if(window.innerWidth < 768) {
           btn.classList.add('bg-[#b7102a]', 'text-white', 'rounded-[32px]', 'py-2');
           btn.classList.remove('text-[#191c1f]', 'opacity-40');
        } else {
           btn.classList.add('nav-active');
        }
      }
    });
  };

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchView(target, btn);
    });
  });
  
  // Set initial view state
  switchView('view-fuel');

  // --- AUDIO LOGIC ---
  const WebAudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let fuelGain = null;
  let airGain = null;

  const initAudio = () => {
    if (!audioCtx && WebAudioContext) {
      audioCtx = new WebAudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };

  const createNoise = () => {
    if (!audioCtx) return null;
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    return noiseSource;
  };

  const playFuelSound = () => {
    initAudio();
    if (!audioCtx) return;
    if (!fuelGain) {
      fuelGain = audioCtx.createGain();
      fuelGain.connect(audioCtx.destination);
      
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 45;
      osc.connect(fuelGain);
      osc.start();

      const noise = createNoise();
      if (noise) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        noise.connect(filter);
        filter.connect(fuelGain);
        noise.start();
      }

      fuelGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    fuelGain.gain.setTargetAtTime(0.4, audioCtx.currentTime, 0.1);
  };

  const stopFuelSound = () => {
    if (fuelGain && audioCtx) {
      fuelGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    }
  };

  const playAirSound = () => {
    initAudio();
    if (!audioCtx) return;
    if (!airGain) {
      airGain = audioCtx.createGain();
      airGain.connect(audioCtx.destination);
      
      const noise = createNoise();
      if (noise) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        noise.connect(filter);
        filter.connect(airGain);
        noise.start();
      }

      airGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    airGain.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.1);
  };

  const stopAirSound = () => {
    if (airGain && audioCtx) {
      airGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    }
  };

  const playDingSound = () => {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  };

  // --- REFUELING LOGIC ---
  const priceValEl = document.getElementById('price-val');
  const paidValEl = document.getElementById('paid-val');
  const pumpedValEl = document.getElementById('pumped-val');
  const fuelTypeBtns = document.querySelectorAll('.fuel-type-btn');
  const triggerBtn = document.getElementById('trigger-btn');
  const triggerProgress = document.getElementById('trigger-progress');
  const prepayBtns = document.querySelectorAll('.prepay-btn');
  
  const ticketArea = document.getElementById('ticket-area');

  let currentPrice = 1.849;
  let prepayAmount = 100; // max limit
  let currentPaid = 0.0;
  let currentPumped = 0.0;
  let isRefueling = false;
  let refuelInterval = null;
  let selectedFuelType = '95';

  // Fuel Type Selection
  fuelTypeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (isRefueling) return; // Prevent change during pumping
      
      fuelTypeBtns.forEach(b => {
        b.classList.remove('text-primary', 'border-primary', 'active');
        b.classList.add('text-on-surface', 'border-on-surface', 'opacity-40');
      });
      e.target.classList.add('text-primary', 'border-primary', 'active');
      e.target.classList.remove('text-on-surface', 'border-on-surface', 'opacity-40');
      
      currentPrice = parseFloat(e.target.getAttribute('data-price'));
      selectedFuelType = e.target.innerText;
      priceValEl.textContent = currentPrice.toFixed(3);
      
      // Reset values
      currentPaid = 0.0;
      currentPumped = 0.0;
      updateDisplay();
      hideTicket();
    });
  });

  // Prepay buttons
  prepayBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (isRefueling && currentPaid > 0) return;
      prepayAmount = parseFloat(btn.getAttribute('data-amt'));
      
      // subtle visual feedback
      prepayBtns.forEach(b => b.classList.remove('bg-surface-variant'));
      btn.classList.add('bg-surface-variant');
      
      // Reset values if requested a new prepay
      currentPaid = 0.0;
      currentPumped = 0.0;
      updateDisplay();
      hideTicket();
    });
  });

  const updateDisplay = () => {
    paidValEl.textContent = currentPaid.toFixed(2).padStart(5, '0');
    pumpedValEl.textContent = currentPumped.toFixed(3);
  };
  
  const generateTicket = () => {
      if (currentPaid <= 0) return;
      
      const d = new Date();
      document.getElementById('t-date').innerText = d.toLocaleDateString();
      document.getElementById('t-time').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      document.getElementById('t-type').innerText = selectedFuelType;
      document.getElementById('t-liters').innerText = currentPumped.toFixed(3) + 'L';
      document.getElementById('t-total').innerText = currentPaid.toFixed(2) + ' EUR';
      
      ticketArea.classList.remove('translate-y-full');
      ticketArea.classList.add('translate-y-4');
  };
  
  const hideTicket = () => {
      ticketArea.classList.add('translate-y-full');
      ticketArea.classList.remove('translate-y-4');
  };

  const startRefuel = () => {
    if (currentPaid >= prepayAmount) return;
    isRefueling = true;
    hideTicket();
    
    playFuelSound();
    
    refuelInterval = setInterval(() => {
      const incrementLiters = 0.15; // fast pumping
      const incrementEuros = incrementLiters * currentPrice;
      
      if (currentPaid + incrementEuros >= prepayAmount) {
        currentPaid = prepayAmount;
        currentPumped = currentPaid / currentPrice;
        stopRefuel();
      } else {
        currentPaid += incrementEuros;
        currentPumped += incrementLiters;
      }
      
      updateDisplay();
      
      const pct = (currentPaid / prepayAmount) * 100;
      triggerProgress.style.transform = `scaleX(${pct / 100})`;
      
    }, 50);
  };

  const stopRefuel = () => {
    isRefueling = false;
    clearInterval(refuelInterval);
    triggerProgress.style.transform = 'scaleX(0)';
    
    stopFuelSound();
    
    // give ticket if dispensed anything
    if (currentPaid > 0) {
        setTimeout(generateTicket, 500);
    }
  };

  triggerBtn.addEventListener('mousedown', startRefuel);
  triggerBtn.addEventListener('mouseup', stopRefuel);
  triggerBtn.addEventListener('mouseleave', stopRefuel);
  triggerBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRefuel(); });
  triggerBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRefuel(); });
  triggerBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopRefuel(); });

  // --- AIR PRESSURE LOGIC ---
  const targetValEl = document.getElementById('pressure-val');
  const currentValEl = document.getElementById('current-pressure-val');
  const airNeedle = document.getElementById('air-needle');
  const btnPlus = document.getElementById('btn-plus');
  const btnMinus = document.getElementById('btn-minus');
  const btnInflate = document.getElementById('btn-inflate');

  let targetPressure = 2.5;
  let currentPressure = 0.0; // Assume flat tire attached
  let airInterval = null;

  const updateAirNeedle = (pressure) => {
    // Map 0 to 4 bar to -135deg to +135deg
    // 0 bar = -135deg
    // 4 bar = 135deg
    const p = Math.min(Math.max(pressure, 0), 4);
    const rotation = -135 + (p / 4) * 270;
    airNeedle.style.transform = `rotate(${rotation}deg)`;
  };

  updateAirNeedle(targetPressure);

  btnPlus.addEventListener('click', () => {
    if(targetPressure < 4.0) {
      targetPressure += 0.1;
      targetValEl.textContent = targetPressure.toFixed(1);
      updateAirNeedle(targetPressure);
    }
  });

  btnMinus.addEventListener('click', () => {
    if(targetPressure > 1.0) {
      targetPressure -= 0.1;
      targetValEl.textContent = targetPressure.toFixed(1);
      updateAirNeedle(targetPressure);
    }
  });

  btnInflate.addEventListener('click', () => {
    if (airInterval) return;
    
    currentPressure = (Math.random() * 1.5) + 0.5; // Random start pressure between 0.5 and 2.0
    currentValEl.textContent = currentPressure.toFixed(1);
    
    btnInflate.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span> Inflando...';
    btnInflate.classList.add('opacity-50');

    playAirSound();

    airInterval = setInterval(() => {
      let diff = targetPressure - currentPressure;
      
      if (Math.abs(diff) < 0.05) {
        currentPressure = targetPressure;
        currentValEl.textContent = currentPressure.toFixed(1);
        updateAirNeedle(currentPressure);
        clearInterval(airInterval);
        airInterval = null;
        
        stopAirSound();
        playDingSound();
        
        btnInflate.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Completado';
        btnInflate.classList.remove('opacity-50', 'bg-secondary');
        btnInflate.classList.add('bg-green-600');
        
        setTimeout(() => {
            btnInflate.innerHTML = '<span class="material-symbols-outlined">air</span> Iniciar Inflado';
            btnInflate.classList.remove('bg-green-600');
            btnInflate.classList.add('bg-secondary');
        }, 3000);
      } else {
        // move towards target
        currentPressure += (diff > 0 ? 0.1 : -0.1);
        currentValEl.textContent = currentPressure.toFixed(1);
        updateAirNeedle(currentPressure);
      }
    }, 300);
  });
});
