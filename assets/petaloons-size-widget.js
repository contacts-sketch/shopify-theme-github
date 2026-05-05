(function () {
  var widget = document.getElementById("petaloons-size-widget");

  if (!widget || widget.dataset.initialized === "true") {
    return;
  }

  widget.dataset.initialized = "true";

  var panel = widget.querySelector("[data-widget-panel]") || widget.querySelector(".petaloons-size-widget__panel");
  var chatLog = widget.querySelector("[data-chat-log]");
  var inputArea = widget.querySelector("[data-input-area]");
  var openButton = widget.querySelector("[data-widget-open]");
  var closeButton = widget.querySelector("[data-widget-close]");
  var restartButton = widget.querySelector("[data-widget-restart]");
  var sizeChartUrl = widget.getAttribute("data-size-chart-url") || "/pages/size-chart";
  var whatsappUrl = widget.getAttribute("data-whatsapp-url") || "https://wa.me/0000000000";

  var SIZE_RULES = [
    { size: "XS", neck: 12, chest: 20, waist: 18, back: 14 },
    { size: "S", neck: 14, chest: 24, waist: 22, back: 17 },
    { size: "M", neck: 16, chest: 28, waist: 26, back: 20 },
    { size: "L", neck: 19, chest: 33, waist: 30, back: 23 },
    { size: "XL", neck: 22, chest: 36, waist: 33, back: 26 },
    { size: "XXL", neck: 25, chest: 40, waist: 37, back: 29 },
    { size: "XXXL", neck: 28, chest: 44, waist: 41, back: 32 }
  ];

  var BREED_RULES = {
    chihuahua: "XS",
    "mini pom": "XS",
    "yorkshire terrier": "XS",
    "shih tzu": "S",
    maltese: "S",
    "toy poodle": "S",
    "lhasa apso": "S",
    pug: "S",
    "french bulldog": "M",
    beagle: "M",
    dachshund: "M",
    pomeranian: "M",
    "cocker spaniel": "M",
    indie: "M",
    spitz: "L",
    dalmatian: "L",
    labrador: "XL",
    "golden retriever": "XL",
    husky: "XL",
    "german shepherd": "XL",
    boxer: "XL",
    rottweiler: "XL",
    "saint bernard": "XXL",
    "chow chow": "XXL",
    "great dane": "XXXL",
    samoyed: "XXXL"
  };

  var SIZE_LINKS = {
    XS: "/collections/dog-clothes?filter.v.option.size=XS",
    S: "/collections/dog-clothes?filter.v.option.size=S",
    M: "/collections/dog-clothes?filter.v.option.size=M",
    L: "/collections/dog-clothes?filter.v.option.size=L",
    XL: "/collections/dog-clothes?filter.v.option.size=XL",
    XXL: "/collections/dog-clothes?filter.v.option.size=XXL",
    XXXL: "/collections/dog-clothes?filter.v.option.size=XXXL",
    "Custom Size": "/pages/size-chart"
  };

  var QUESTIONS = {
    breed: {
      key: "breed",
      prompt: "What is your dog's breed?",
      type: "text",
      placeholder: "Example: Beagle",
      submitLabel: "Continue",
      hint: "If you're unsure, enter the closest breed or mix."
    },
    knowsMeasurements: {
      key: "knowsMeasurements",
      prompt: "Do you know your pet's measurements?",
      type: "choice",
      choices: [
        { value: "yes", label: "Yes, I know them" },
        { value: "no", label: "No, suggest by breed" }
      ]
    },
    chest: {
      key: "chest",
      prompt: "Please enter your dog's chest girth in inches.",
      type: "number",
      placeholder: "Example: 21.5",
      submitLabel: "Next",
      hint: "Measure around the widest part of the chest."
    },
    back: {
      key: "back",
      prompt: "Please enter your dog's back length in inches.",
      type: "number",
      placeholder: "Example: 16",
      submitLabel: "Next",
      hint: "Measure from the base of the neck to the tail start."
    },
    neck: {
      key: "neck",
      prompt: "Please enter your dog's neck girth in inches.",
      type: "number",
      placeholder: "Example: 12",
      submitLabel: "Next",
      hint: "Measure around the base of the neck where the collar rests."
    },
    waist: {
      key: "waist",
      prompt: "Please enter your dog's waist girth in inches.",
      type: "number",
      placeholder: "Example: 17",
      submitLabel: "See Recommendation",
      hint: "Measure around the tummy at the narrowest comfortable point."
    }
  };

  var state = {};
  var lastFocusedElement = null;

  function resetState() {
    state = {
      breed: "",
      knowsMeasurements: "",
      measurements: {
        chest: null,
        back: null,
        neck: null,
        waist: null
      },
      recommendation: null
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function titleCase(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });
  }

  function normalizeBreed(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function scrollChatToBottom() {
    window.requestAnimationFrame(function () {
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  }

  function appendMessage(role, html) {
    var message = document.createElement("div");
    message.className = "petaloons-size-widget__message petaloons-size-widget__message--" + role;
    message.innerHTML = html;
    chatLog.appendChild(message);
    scrollChatToBottom();
  }

  function addBotMessage(text) {
    appendMessage("bot", "<p>" + escapeHtml(text) + "</p>");
  }

  function addUserMessage(text) {
    appendMessage("user", "<p>" + escapeHtml(text) + "</p>");
  }

  function clearInputArea() {
    inputArea.innerHTML = "";
  }

  function renderChoiceInput(question, onChoose) {
    clearInputArea();

    var wrapper = document.createElement("div");
    wrapper.className = "petaloons-size-widget__choice-group";

    question.choices.forEach(function (choice) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "petaloons-size-widget__choice";
      button.textContent = choice.label;
      button.addEventListener("click", function () {
        onChoose(choice);
      });
      wrapper.appendChild(button);
    });

    inputArea.appendChild(wrapper);
  }

  function renderTextInput(question, onSubmit) {
    clearInputArea();

    var form = document.createElement("form");
    var label = document.createElement("label");
    var row = document.createElement("div");
    var input = document.createElement("input");
    var button = document.createElement("button");
    var hint = document.createElement("p");
    var error = document.createElement("p");

    form.noValidate = true;
    label.className = "petaloons-size-widget__input-label";
    label.textContent = question.prompt;

    row.className = "petaloons-size-widget__input-row";
    input.className = "petaloons-size-widget__text-input";
    input.type = question.type === "number" ? "number" : "text";
    input.inputMode = question.type === "number" ? "decimal" : "text";
    input.step = question.type === "number" ? "0.1" : "";
    input.min = question.type === "number" ? "0" : "";
    input.placeholder = question.placeholder || "";
    input.autocomplete = "off";
    input.required = true;
    input.setAttribute("aria-label", question.prompt);

    button.type = "submit";
    button.className = "petaloons-size-widget__submit";
    button.textContent = question.submitLabel || "Continue";

    hint.className = "petaloons-size-widget__hint";
    hint.textContent = question.hint || "";

    error.className = "petaloons-size-widget__error";
    error.hidden = true;

    row.appendChild(input);
    row.appendChild(button);
    form.appendChild(label);
    form.appendChild(row);

    if (question.hint) {
      form.appendChild(hint);
    }

    form.appendChild(error);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = onSubmit(input.value);

      if (result && result.error) {
        error.hidden = false;
        error.textContent = result.error;
        input.setAttribute("aria-invalid", "true");
        return;
      }

      error.hidden = true;
      error.textContent = "";
      input.removeAttribute("aria-invalid");
    });

    inputArea.appendChild(form);
    input.focus();
  }

  function parseMeasurement(value) {
    var parsed = parseFloat(String(value).trim());

    if (!isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return Math.round(parsed * 10) / 10;
  }

  function findSizeIndexForMeasurement(metric, value) {
    for (var i = 0; i < SIZE_RULES.length; i += 1) {
      if (value <= SIZE_RULES[i][metric]) {
        return i;
      }
    }

    return -1;
  }

  function getMeasuredRecommendation(measurements) {
    var adjusted = {
      neck: measurements.neck + 1,
      chest: measurements.chest + 4,
      waist: measurements.waist + 4,
      back: measurements.back
    };

    var chestIndex = findSizeIndexForMeasurement("chest", adjusted.chest);
    var backIndex = findSizeIndexForMeasurement("back", adjusted.back);
    var neckIndex = findSizeIndexForMeasurement("neck", adjusted.neck);
    var waistIndex = findSizeIndexForMeasurement("waist", adjusted.waist);

    if ([chestIndex, backIndex, neckIndex, waistIndex].indexOf(-1) !== -1) {
      return {
        size: "Custom Size",
        note: "Your pet's measurements are beyond our standard chart, so a custom fit would be safest.",
        source: "measurement"
      };
    }

    var finalIndex = Math.max(chestIndex, backIndex, neckIndex, waistIndex);
    var size = SIZE_RULES[finalIndex].size;
    var note = "We prioritized chest fit first, then back length, with Petaloons ease added to neck and waist for comfort.";

    if (finalIndex > chestIndex) {
      note = "We sized up to keep the fit comfortable across all measurements, with chest still taking priority.";
    }

    return {
      size: size,
      note: note,
      source: "measurement"
    };
  }

  function getBreedRecommendation(breed) {
    var normalizedBreed = normalizeBreed(breed);
    var size = BREED_RULES[normalizedBreed];

    if (!size) {
      return {
        size: "M",
        note: "We could not match that breed exactly, so this is a general starting point. If you can, compare with the size chart before ordering.",
        source: "breed"
      };
    }

    return {
      size: size,
      note: "This is a breed-based estimate. For the best accuracy, compare your pet's measurements with our size chart.",
      source: "breed"
    };
  }

  function getShopUrl(size) {
    return SIZE_LINKS[size] || "/collections/dog-clothes";
  }

  function renderResult(recommendation) {
    clearInputArea();

    var resultHtml = [
      '<div class="petaloons-size-widget__result">',
      '<p class="petaloons-size-widget__message-title">Recommended size</p>',
      '<span class="petaloons-size-widget__size-chip">' + escapeHtml(recommendation.size) + "</span>",
      "<p>" + escapeHtml(recommendation.note) + "</p>",
      '<div class="petaloons-size-widget__cta-group">',
      '<a class="petaloons-size-widget__cta petaloons-size-widget__cta--primary" href="' + escapeHtml(getShopUrl(recommendation.size)) + '">Shop This Size</a>',
      '<a class="petaloons-size-widget__cta petaloons-size-widget__cta--secondary" href="' + escapeHtml(sizeChartUrl) + '">View Size Chart</a>',
      '<a class="petaloons-size-widget__cta petaloons-size-widget__cta--secondary" href="' + escapeHtml(whatsappUrl) + '" target="_blank" rel="noopener noreferrer">WhatsApp Help</a>',
      "</div>",
      "</div>"
    ].join("");

    appendMessage("bot", resultHtml);
  }

  function askBreed() {
    addBotMessage(QUESTIONS.breed.prompt);
    renderTextInput(QUESTIONS.breed, function (value) {
      var breed = normalizeBreed(value);

      if (!breed) {
        return { error: "Please enter your dog's breed to continue." };
      }

      state.breed = breed;
      addUserMessage(titleCase(breed));
      askKnowledgeStep();
      return {};
    });
  }

  function askKnowledgeStep() {
    addBotMessage(QUESTIONS.knowsMeasurements.prompt);
    renderChoiceInput(QUESTIONS.knowsMeasurements, function (choice) {
      state.knowsMeasurements = choice.value;
      addUserMessage(choice.label);

      if (choice.value === "yes") {
        askMeasurement("chest");
        return;
      }

      state.recommendation = getBreedRecommendation(state.breed);
      renderResult(state.recommendation);
    });
  }

  function askMeasurement(metricKey) {
    var question = QUESTIONS[metricKey];
    addBotMessage(question.prompt);

    renderTextInput(question, function (value) {
      var measurement = parseMeasurement(value);

      if (measurement === null) {
        return { error: "Please enter a valid number greater than 0." };
      }

      state.measurements[metricKey] = measurement;
      addUserMessage(measurement + " in");

      if (metricKey === "chest") {
        askMeasurement("back");
        return {};
      }

      if (metricKey === "back") {
        askMeasurement("neck");
        return {};
      }

      if (metricKey === "neck") {
        askMeasurement("waist");
        return {};
      }

      state.recommendation = getMeasuredRecommendation(state.measurements);
      renderResult(state.recommendation);
      return {};
    });
  }

  function startChat() {
    resetState();
    chatLog.innerHTML = "";
    clearInputArea();
    addBotMessage("Hi there! I'll help you find the best Petaloons clothing size for your dog.");
    askBreed();
  }

  function openWidget() {
    lastFocusedElement = document.activeElement;
    widget.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    openButton.setAttribute("aria-expanded", "true");

    if (!chatLog.children.length) {
      startChat();
    } else {
      var focusable = inputArea.querySelector("input, button, a");
      if (focusable) {
        focusable.focus();
      }
    }
  }

  function closeWidget() {
    widget.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    openButton.setAttribute("aria-expanded", "false");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    } else {
      openButton.focus();
    }
  }

  openButton.addEventListener("click", function () {
    if (widget.classList.contains("is-open")) {
      closeWidget();
      return;
    }

    openWidget();
  });

  closeButton.addEventListener("click", closeWidget);
  restartButton.addEventListener("click", startChat);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && widget.classList.contains("is-open")) {
      closeWidget();
    }
  });
})();
