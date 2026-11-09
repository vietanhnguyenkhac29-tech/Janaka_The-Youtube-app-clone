(() => {
	"use strict";

	const serviceWorkerUrl = "./mobile/sw.js";

	if ("serviceWorker" in navigator) {
		window.addEventListener("load", () => {
			navigator.serviceWorker.register(serviceWorkerUrl, { scope: "./" })
				.then((registration) => {
					registration.addEventListener("updatefound", () => {
						const worker = registration.installing;
						if (!worker) return;

						worker.addEventListener("statechange", () => {
							if (worker.state === "installed" && navigator.serviceWorker.controller) {
								window.dispatchEvent(new CustomEvent("janaka-pwa-updated"));
							}
						});
					});
				})
				.catch((error) => {
					console.warn("Janaka PWA registration failed:", error);
				});
		});
	}

	let deferredInstallPrompt;

	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		deferredInstallPrompt = event;
		window.dispatchEvent(new CustomEvent("janaka-install-available"));
	});

	window.janakaInstallApp = async () => {
		if (!deferredInstallPrompt) return false;

		deferredInstallPrompt.prompt();
		const choice = await deferredInstallPrompt.userChoice;
		deferredInstallPrompt = null;
		return choice.outcome === "accepted";
	};

	window.addEventListener("appinstalled", () => {
		deferredInstallPrompt = null;
	});
})();
