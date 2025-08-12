const http = new XMLHttpRequest();
var data;
var output = '';
var exportStyle = 0;
var escapeNewLine = false;
var spaceComment = false;
var paramCheck = new Set([
	'url',
	'exportStyle',
	'escapeNewLine',
	'spaceComment',
]);

const getParam = (key) =>
	new URLSearchParams(window.location.search).get(key) ?? null;

/** @param {{param: string, string}[]} params */
const setParam = ({param, value}) => {
	const pageUrl = new URL(window.location);
	pageUrl.searchParams.set(param, value);
	history.pushState(null, '', pageUrl);
};

/** @returns {{[key: string]: string}} */
const setStateFromParams = () => {
	const paramsSet = {};
	const searchParams = new URLSearchParams(window.location.search);
	for (const [key, value] of searchParams.entries()) {
		if (paramCheck.has(key)) {
			window[key] = value;
			paramsSet[key] = value;
		}
	}
	return paramsSet;
};

const onDocumentReady = () => {
	const paramsSet = setStateFromParams();
	if (paramsSet['url']) {
		document.getElementById('url-field').value = paramsSet['url'];
		startExport(paramsSet['url']);
	}

	bindFormElements();
};

const bindFormElements = () => {
	const form = document.querySelector('form');
	form.addEventListener('change', function (e) {
		const name = e.target.name;
		switch (name) {
			case 'escapeNewLine':
			case 'spaceComment':
				window[name] = e.target.checked;
				setParam({param: name, value: e.target.checked});
				break;
			case 'exportStyle':
			case 'url':
				setParam({param: name, value: e.target.value});
				break;
		}
	});
};

const setQueryParamUrl = (url = '') => {
	const useUrl = url || document.getElementById('url-field').value;
	setParam({param: 'url', value: useUrl});
};
const getFieldUrl = () => document.getElementById('url-field').value;

const isValidURL = (url) => {
	try {
		new URL(url);
		return true;
	} catch (_) {
		setParam({param: 'url', value: ''});
		return false;
	}
};
function fetchData(url) {
	output = '';

	http.open('GET', `${url}.json`);
	http.responseType = 'json';
	http.send();

	http.onload = function () {
		data = http.response;
		const post = data[0].data.children[0].data;
		const comments = data[1].data.children;
		displayTitle(post);
		output += '\n\n## Comments\n\n';
		comments.forEach(displayComment);

		console.log('Done');
		var ouput_display = document.getElementById('ouput-display');
		var ouput_block = document.getElementById('ouput-block');
		ouput_block.removeAttribute('hidden');
		ouput_display.innerHTML = output;
		download(output, 'output.md', 'text/plain');
	};
}

function startExport(url) {
	url = url ?? getParam('url') ?? getFieldUrl();
	console.log('Start exporting');

	if (isValidURL(url)) {
		fetchData(url);
		setQueryParamUrl(url);
	} else {
		console.log('Bad / No url provided');
	}
}

function download(text, name, type) {
	var a = document.getElementById('a');
	a.removeAttribute('disabled');
	var file = new Blob([text], {type: type});
	a.href = URL.createObjectURL(file);
	a.download = name;
}

function displayTitle(post) {
	output += `# ${post.title}\n`;
	if (post.selftext) {
		output += `\n${post.selftext}\n`;
	}
	output += `\n[permalink](http://reddit.com${post.permalink})`;
	output += `\nby *${post.author}* (↑ ${post.ups}/ ↓ ${post.downs})`;
}

function formatComment(text) {
	if (escapeNewLine) {
		return text.replace(/(\r\n|\n|\r)/gm, '');
	} else {
		return text;
	}
}

function displayComment(comment, index) {
	if (exportStyle == 0) {
		depthTag = '─'.repeat(comment.data.depth);
		if (depthTag != '') {
			output += `├${depthTag} `;
		} else {
			output += `##### `;
		}
	} else {
		depthTag = '\t'.repeat(comment.data.depth);
		if (depthTag != '') {
			output += `${depthTag}- `;
		} else {
			output += `- `;
		}
	}

	if (comment.data.body) {
		console.log(formatComment(comment.data.body));
		output += `${formatComment(comment.data.body)} ⏤ by *${
			comment.data.author
		}* (↑ ${comment.data.ups}/ ↓ ${comment.data.downs})\n`;
	} else {
		output += 'deleted \n';
	}

	if (comment.data.replies) {
		const subComment = comment.data.replies.data.children;
		subComment.forEach(displayComment);
	}

	if (comment.data.depth == 0 && comment.data.replies) {
		if (exportStyle == 0) {
			output += '└────\n\n';
		}
		if (spaceComment) {
			output += '\n';
		}
	}
}
