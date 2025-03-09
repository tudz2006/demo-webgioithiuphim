document.addEventListener("DOMContentLoaded", function () {
    let enableDynamicLoad = false;

    function loadFullPage(url) {
        if (!enableDynamicLoad) {
            location.href = url;
            return;
        }

        history.pushState(null, "", url);

        fetch(url)
            .then(response => response.text())
            .then(data => {
                let newDoc = new DOMParser().parseFromString(data, "text/html");
                document.documentElement.replaceWith(newDoc.documentElement);

                setTimeout(() => {
                    attachDynamicLinks();
                    loadHeaderFooter();
                }, 100);
            })
            .catch(error => console.error("Lỗi tải trang:", error));
    }

    async function attachDynamicLinks() {
        document.querySelectorAll("a").forEach(link => {
            let href = link.getAttribute("href");

            if (!href || href.startsWith("http")) return;

            if (href === "#") {
                link.addEventListener("click", function (event) {
                    event.preventDefault();
                });
                return;
            }

            if (href.startsWith("#")) {
                link.addEventListener("click", function (event) {
                    event.preventDefault();
                    history.pushState(null, "", href);
                    let target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: "smooth" });
                    }
                });
                return;
            }

            link.addEventListener("click", function (event) {
                if (!enableDynamicLoad) return;
                event.preventDefault();
                loadFullPage(this.getAttribute("href"));
            });
        });
    }

    async function loadHeaderFooter() {
        const components = [
            { id: "header", file: "../config/header.html" },
            { id: "footer", file: "../config/footer.html" }
        ];

        Promise.all(components.map(async ({ id, file }) => {
            try {
                const response = await fetch(file);
                if (!response.ok) throw new Error(`Lỗi tải ${file}: ${response.statusText}`);
                const htmlContent = await response.text();
                const element = document.getElementById(id);
                setInnerHTMLWithScripts(element, htmlContent);

                attachDynamicLinks();
            } catch (error) {
                console.error(error);
            }
        }));
    }

    function setInnerHTMLWithScripts(element, html) {
        element.innerHTML = html;
        let scripts = element.querySelectorAll("script");
        scripts.forEach(oldScript => {
            let newScript = document.createElement("script");
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            document.body.appendChild(newScript).parentNode.removeChild(newScript);
        });
    }

    attachDynamicLinks();
    loadHeaderFooter();

    window.addEventListener("popstate", function () {
        loadFullPage(location.pathname);
    });

    window.toggleDynamicLoad = function (state) {
        enableDynamicLoad = state;
    };
});

