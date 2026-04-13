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

  const playPrintSound = () => {
    // Removed audio context as requested, using vibration API
    if (navigator.vibrate) {
      // Pattern simulating thermal printer stepper motor
      // 30ms vibrate, 70ms pause. Repeated for ~3 seconds
      const pattern = [];
      for (let i = 0; i < 30; i++) {
        pattern.push(30);
        pattern.push(70);
      }
      navigator.vibrate(pattern);
    }
  };

  // --- REFUELING LOGIC ---
  const priceValEl = document.getElementById('price-val');
  const paidValEl = document.getElementById('paid-val');
  const pumpedValEl = document.getElementById('pumped-val');
  const fuelTypeBtns = document.querySelectorAll('.fuel-type-btn');
  const triggerBtn = document.getElementById('trigger-btn');
  const triggerProgress = document.getElementById('trigger-progress');
  const prepayBtns = document.querySelectorAll('.prepay-btn');
  
  const finishBtn = document.getElementById('finish-btn');
  const finishModal = document.getElementById('finish-modal');
  const modalTotal = document.getElementById('modal-total');
  const btnPrintTicket = document.getElementById('btn-print-ticket');
  const ticketModal = document.getElementById('ticket-modal');
  const printTicketArea = document.getElementById('print-ticket-area');
  const btnCollectTicket = document.getElementById('btn-collect-ticket');
  const ticketCloseContainer = document.getElementById('ticket-close-container');

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
        b.classList.remove('bg-primary', 'text-white', 'active', 'shadow-md');
        b.classList.add('bg-surface-container-highest', 'text-on-surface', 'opacity-70');
      });
      e.target.classList.add('bg-primary', 'text-white', 'active', 'shadow-md');
      e.target.classList.remove('bg-surface-container-highest', 'text-on-surface', 'opacity-70');
      
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
      prepayBtns.forEach(b => {
         b.classList.remove('ring-2', 'ring-primary', 'ring-inset', 'text-primary', 'bg-primary/10');
         b.classList.add('text-on-surface');
      });
      btn.classList.remove('text-on-surface');
      btn.classList.add('ring-2', 'ring-primary', 'ring-inset', 'text-primary', 'bg-primary/10');
      
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
  
  const showFinishModal = () => {
      modalTotal.textContent = currentPaid.toFixed(2) + '€';
      finishModal.classList.remove('hidden-view');
  };

  finishBtn.addEventListener('click', showFinishModal);

  btnPrintTicket.addEventListener('click', () => {
      finishModal.classList.add('hidden-view');
      finishBtn.classList.add('hidden');
      generateTicket();
  });

  finishModal.addEventListener('click', (e) => {
      if (e.target === finishModal) {
          finishModal.classList.add('hidden-view');
          finishBtn.classList.add('hidden');
          // Reset completely for the next customer
          currentPaid = 0.0;
          currentPumped = 0.0;
          updateDisplay();
      }
  });
  
  const generateTicket = () => {
      if (currentPaid <= 0) return;
      
      const d = new Date();
      document.getElementById('t-date').innerText = d.toLocaleDateString();
      document.getElementById('t-time').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      document.getElementById('t-type').innerText = selectedFuelType;
      document.getElementById('t-liters').innerText = currentPumped.toFixed(3) + ' L';
      document.getElementById('t-price').innerText = currentPrice.toFixed(3) + ' €';
      document.getElementById('t-total').innerText = currentPaid.toFixed(2) + ' EUR';
      
      // Reset position and opacity
      printTicketArea.style.transform = 'translateY(-100%)';
      ticketCloseContainer.classList.add('opacity-0');
      
      // Show modal
      ticketModal.classList.remove('hidden-view');
      
      // trigger sound
      playPrintSound();
      
      // Trigger animation frame so transition applies correctly
      requestAnimationFrame(() => {
          setTimeout(() => {
              // Slide down out of slot
              printTicketArea.style.transform = 'translateY(10%)';
              
              // Show collect button afterwards
              setTimeout(() => {
                  ticketCloseContainer.classList.remove('opacity-0');
              }, 3000); // Wait 3s (css transition is 3000ms)
          }, 50);
      });
  };

  btnCollectTicket.addEventListener('click', () => {
     ticketModal.classList.add('hidden-view');
     // Reset completely for the next customer
     currentPaid = 0.0;
     currentPumped = 0.0;
     updateDisplay();
  });
  
  const hideTicket = () => {};

  const startRefuel = () => {
    if (currentPaid >= prepayAmount) return;
    if (isRefueling) return;
    isRefueling = true;
    hideTicket();
    finishBtn.classList.add('hidden');
    
    playFuelSound();
    if (navigator.vibrate) navigator.vibrate([250]);
    let vCounter = 0;
    
    refuelInterval = setInterval(() => {
      vCounter++;
      if (vCounter % 4 === 0 && navigator.vibrate) {
         navigator.vibrate([250]);
      }

      const incrementLiters = 0.15; // fast pumping
      const incrementEuros = incrementLiters * currentPrice;
      
      if (currentPaid + incrementEuros >= prepayAmount) {
        currentPaid = prepayAmount;
        currentPumped = currentPaid / currentPrice;
        stopRefuel();
        showFinishModal();
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
    if (!isRefueling) return;
    isRefueling = false;
    clearInterval(refuelInterval);
    refuelInterval = null;
    triggerProgress.style.transform = 'scaleX(0)';
    
    stopFuelSound();
    if (navigator.vibrate) {
        navigator.vibrate(0);
        navigator.vibrate([]); // Fallback para algunos motores chromium en móviles
    }
    
    if (currentPaid > 0 && currentPaid < prepayAmount) {
        finishBtn.classList.remove('hidden');
    }
  };

  triggerBtn.addEventListener('mousedown', startRefuel);
  triggerBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRefuel(); }, {passive: false});
  triggerBtn.addEventListener('mouseleave', stopRefuel);

  window.addEventListener('mouseup', stopRefuel);
  window.addEventListener('touchend', stopRefuel);
  window.addEventListener('touchcancel', stopRefuel);

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
