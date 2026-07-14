// ==UserScript==
// @name         轻小说文库移除NTR
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  NTR什么的不要啊
// @author       Github@RuizeSun
// @match        *://*.wenku8.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
	"use strict";

	const DEBUG = false;

	function log(msg) {
		if (DEBUG) console.log("[移除NTR]", msg);
	}

	// =====================
	// 0. 页面重定向（优先）
	// =====================
	(function redirectNTRTagPage() {
		try {
			const url = new URL(window.location.href);
			const tag = url.searchParams.get("t");
			if (tag && tag.toLowerCase() === "ntr") {
				log("检测到NTR标签页，正在跳转至恋爱标签页...");
				window.location.replace("https://www.wenku8.net/modules/article/tags.php?t=%C1%B5%B0%AE");
			}
		} catch (e) {
			console.warn("[移除NTR] URL解析失败", e);
		}
	})();

	// =====================
	// 1. 工具函数
	// =====================
	function isBookContainer(div) {
		if (!div || div.tagName !== "DIV") return false;
		const hasImg = div.querySelector("img") !== null;
		const hasBookLink = div.querySelector('a[href*="/book/"]') !== null;
		const hasP = div.querySelector("p") !== null;
		const style = div.getAttribute("style") || "";
		const widthMatch = style.match(/width\s*:\s*(\d+)px/);
		const width = widthMatch ? parseInt(widthMatch[1]) : 0;
		const isTypicalWidth = width >= 350 && width <= 400;
		return hasImg && hasBookLink && hasP && isTypicalWidth;
	}

	function findBookContainer(element) {
		let el = element;
		let depth = 0;
		while (el && el.tagName !== "BODY" && depth < 10) {
			if (el.tagName === "DIV" && isBookContainer(el)) {
				return el;
			}
			el = el.parentElement;
			depth++;
		}
		return null;
	}

	// =====================
	// 2. 全局文本替换
	// =====================
	function replaceNTRText() {
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: function (node) {
					// 跳过 script 和 style 标签内的文本
					const parent = node.parentElement;
					if (parent && (parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.tagName === "NOSCRIPT")) {
						return NodeFilter.FILTER_REJECT;
					}
					return NodeFilter.FILTER_ACCEPT;
				},
			},
			false,
		);

		let node;
		let replacedCount = 0;
		while ((node = walker.nextNode()) !== null) {
			if (node.textContent && node.textContent.includes("NTR")) {
				node.textContent = node.textContent.replace(/NTR/g, "***");
				replacedCount++;
			}
		}
		if (replacedCount > 0) {
			log(`已将 ${replacedCount} 个文本节点中的"NTR"替换为"***"`);
		}
	}

	// =====================
	// 3. 核心清理函数
	// =====================
	function cleanNTR() {
		const removedBooks = new Set();
		const removedLinks = new Set();

		// 3.1 移除书籍卡片（Tags 中包含 NTR）
		const allPTags = document.querySelectorAll("p");
		for (const p of allPTags) {
			if (!p.textContent || !p.textContent.includes("Tags:")) continue;
			const spans = p.querySelectorAll("span");
			let hasNTR = false;
			for (const span of spans) {
				if (span.textContent && span.textContent.includes("NTR")) {
					hasNTR = true;
					break;
				}
			}
			if (hasNTR) {
				const container = findBookContainer(p);
				if (container) {
					removedBooks.add(container);
				}
			}
		}

		if (removedBooks.size > 0) {
			log(`发现 ${removedBooks.size} 本NTR书籍，正在移除...`);
			removedBooks.forEach((container) => {
				container.style.transition = "opacity 0.3s ease";
				container.style.opacity = "0";
				setTimeout(() => {
					container.remove();
					log("已移除一本NTR书籍");
				}, 300);
			});
		}

		// 3.2 移除筛选栏中文本为 "NTR" 的链接
		const allLinks = document.querySelectorAll("a");
		for (const link of allLinks) {
			if (link.textContent.trim() !== "NTR") continue;

			let parent = link.parentElement;
			let isInFilterArea = false;
			let depth = 0;
			while (parent && parent.tagName !== "BODY" && depth < 6) {
				const className = parent.className || "";
				const id = parent.id || "";
				if (className.includes("sidebar") || className.includes("filter") || className.includes("nav") || className.includes("menu") || id.includes("sidebar") || id.includes("filter") || id.includes("nav")) {
					isInFilterArea = true;
					break;
				}
				parent = parent.parentElement;
				depth++;
			}

			if (isInFilterArea) {
				removedLinks.add(link);
			}
		}

		// 移除所有文本为 "NTR" 且不在书籍卡片内的链接
		if (removedLinks.size === 0) {
			for (const link of allLinks) {
				if (link.textContent.trim() !== "NTR") continue;
				const container = findBookContainer(link);
				if (!container) {
					removedLinks.add(link);
				}
			}
		}

		if (removedLinks.size > 0) {
			log(`发现 ${removedLinks.size} 个"NTR"筛选链接，正在移除...`);
			removedLinks.forEach((link) => {
				link.style.transition = "opacity 0.3s ease";
				link.style.opacity = "0";
				setTimeout(() => {
					link.remove();
					log('已移除一个"NTR"链接');
				}, 300);
			});
		}

		// 3.3 全局替换：将剩余所有 "NTR" 文本替换为 "***"
		replaceNTRText();
	}

	// =====================
	// 4. 尽早启动清理
	// =====================
	setTimeout(cleanNTR, 50);
	setInterval(cleanNTR, 5000);
	log('脚本已启动，立即清理并每5秒轮询，所有"NTR"文本将被替换为"***"');
})();
