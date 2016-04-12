window.fs = require('fs');
window.remote = require('remote');
window.dialog = remote.require('dialog');
window.electron = remote.require('electron');
window.storage = require('electron-json-storage');
window.BrowserWindow = require('electron').remote.BrowserWindow;
window.session = require('remote').getCurrentWebContents().session;
var app = window.electron.app;

window.App = {
	proxy_data: Array(),
	links_data: Array(),
	status_message: "",
	current_proxy_no: 0,
	current_proxy: "0.0.0.0:00",
	current_link: 0,
	clicks_no: 0,
	timeout: 35000,
	done: false,
	running: false,
	proxy_file_name: "",
	interval: null,
	next: false,
	last_window: new Date().getTime(),
	current_window: null,
	running_interval: null,
	timedout: false,
	intervals: {
		wait_after_click: null,
		wait_time: null
	},
	wait_time: 10000,
	wait_after_click: 4000,

};



try {
	$(function() {

		window.change_status = function(message) {
			$("#current_status").html(message);
			console.log(message);
			window.update_status();
		};

		window.get_time = function() {
			return (new Date().getTime());
		}

		window.update_status = function() {
			$("#proxy_atual").html(App.current_proxy);
			$("#proxy_number").html(App.proxy_data.length);
			$("#links_number").html(App.links_data.length);
			$("#views_number").html(App.clicks_no);
		};

		window.is_valid_link = function(link) {
			var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
			return regexp.test(link);
		};

		window.validateNum = function(input, min, max) {
		    var num = +input;
		    return num >= min && num <= max && input === num.toString();
		};

		window.validateIpAndPort = function(input) {
		    var parts = input.split(":");
		    var ip = parts[0].split(".");
		    var port = parts[1];
		    return validateNum(port, 1, 65535) &&
		        ip.length == 4 &&
		        ip.every(function (segment) {
		            return validateNum(segment, 0, 255);
		        });
		};



		window.save_links = function() {
			window.storage.set('links_textarea', {
				data: $('#links_textarea').val()
			}, function(error) {});
		};

		window.get_links = function () {
			var links_textarea = $('#links_textarea').val().split('\n');

			if (links_textarea.length >= 1) {

				var has_valid_links = false;
				links_data = Array();

				for(var i = 0; i < links_textarea.length; i++) {
					if (window.is_valid_link(links_textarea[i])) {
						links_data.push(links_textarea[i]);
						has_valid_links = true;
					}
				}

				if (has_valid_links) {
					$("#iniciar_btn").removeClass("disabled");
				} else {
					$("#iniciar_btn").addClass("disabled");
				}

				App.links_data = links_data;

			} else {
				$("#iniciar_btn").addClass("disabled");
			}

			window.update_status();
		};

		$("#links_textarea").keypress(function() {
			window.get_links();
			window.save_links();
		});

		$("#links_textarea").bind('input propertychange', function() {
			window.get_links();
			window.save_links();
		});

		$('#links_textarea').on('paste', function () {
			window.get_links();
			window.save_links();
		});

		window.open_file = function() {
			dialog.showOpenDialog({ filters: [
			   { name: 'Arquivos aceitos', extensions: ['txt', 'csv'] }
			 ]}, function (fileNames) {
				if (fileNames === undefined) {
					return;
				}

				App.proxy_file_name = fileNames[0];
				window.storage.set('proxy_list', { data: App.proxy_file_name }, function(error) {});
				window.read_proxy_list(fileNames[0]);
				var file_name = App.proxy_file_name.split("\\");
				file_name = file_name[file_name.length - 1];
				$(document).find("#proxy_file_list input[type=text]").val(file_name);
			});
		};

		window.change_proxy = function(proxy) {
			proxy = String(proxy).trim();
			window.session.setProxy({
				"proxyRules": proxy
			}, function() {
				App.current_proxy = proxy;
				change_status("Proxy alterado");
			});
		};

		window.next_proxy = function() {
			if (!App.proxy_data) {
				dialog.showErrorBox("Ops, ocorreu um erro", "Nenhuma lista de proxy foi carregada");
				App.running = false;
				return;
			}

			var call_next_proxy = false;

			change_status("Alterando proxy...");
			App.current_proxy = App.proxy_data[App.current_proxy_no];
			App.current_proxy = String(App.current_proxy).trim();
			if (window.validateIpAndPort(App.current_proxy)) {
					change_proxy(App.current_proxy);
			} else {
				dialog.showErrorBox("Ops, ocorreu um erro", "Não foi possivel definir o proxy: " + App.current_proxy);
				call_next_proxy = true;
			}

			App.current_proxy_no++;
			console.log(App.current_proxy);

			if (App.current_proxy_no >= App.proxy_data.length) {
				App.current_proxy = "0.0.0.0:00";
				App.running = false;
				App.done = true;
				change_status("Lista de Proxy completa");
				dialog.showMessageBox({
					type: 'info',
					buttons: ['OK'],
					message: 'Lista de Proxy completa'
				});
				setTimeout(function() {
					change_status("Lista de Proxy completa");
				}, 5000);
			} else {
				if (call_next_proxy) {
					window.next_proxy();
				}
			}
		};

		window.read_proxy_list = function(filename) {
			if (filename) {
				fs.readFile(filename, "utf8", function (err, data) {
            if (err) {
            	dialog.showErrorBox("Erro", "Erro ao abrir o arquivo " + filename);
            	console.log("Erro ao abrir o arquivo " + filename);
            	console.log(err);
            } else {
							App.proxy_data = null;
							App.current_proxy_no = 0;
            	App.proxy_data = data;
            	change_status("Carregando lista de Proxy's");
            	App.proxy_data = App.proxy_data.split('\n');
          		change_status("Pronto");
							window.next_proxy();
						}
        });
			}
		};

		window.open_window = function(url) {
			App.current_window = new window.BrowserWindow({ width: 800, height: 600, show: true });
			App.current_window.loadURL(url);

			change_status("Aguardando carregamento");
			var webContents = App.current_window.webContents;
			window.wc = webContents;

			webContents.on('did-finish-load', function() {
				alert("dom ready");
				if (App.timedout == false) {
					console.log("did-finish-load link Window");

					App.intervals.wait_time = setTimeout(function() {
								change_status("Clicando no link");
								try {
									webContents.executeJavaScript("window.document.querySelector('#skip_button').click()");
									console.log("Clicou no botão Skip com sucesso");
								} catch(err) {
									console.log("Não encontrou link do botão Skip");
									if (App.current_window) {
										App.current_window.close();
									}
								}

								App.intervals.wait_after_click = setTimeout(function() {
									// change_status("Aguardando para fechar");
									// if (App.current_window) {
									// 	App.current_window.close();
									// }
									// window.App.clicks_no++;
								}, App.wait_after_click);
					}, App.wait_time);
				}
			});

			// App.current_window.on('close', function() {
			// 	clearTimeout(App.intervals.wait_after_click);
			// 	clearTimeout(App.intervals.wait_time);
			// 	window.App.next = true;
			// 	App.current_window = null;
			// });

		};

		(function init() {
			window.storage.get('proxy_list', function(error, data) {
				App.proxy_file_name = data.data;

				if (!!App.proxy_file_name) {
					window.read_proxy_list(App.proxy_file_name);
					var file_name = App.proxy_file_name.split("\\");
					file_name = file_name[file_name.length - 1];
					$(document).find("#proxy_file_list input[type=text]").val(file_name);
				}
			});

			window.storage.get('links_textarea', function(error, data) {
				var links_textarea = data.data;

				if (links_textarea) {
					$("#links_textarea").val(links_textarea);
				}

				window.get_links();
			});

			window.update_status();
			window.App.next = true;
		}());


		window.App.running_interval = setInterval(function() {
			if (window.App.running == true && App.done == false) {
				App.last_window = window.get_time(); // remove

				if (window.App.next || (window.get_time() - App.last_window  > App.timeout)) {

					if ((window.get_time() - App.last_window  > App.timeout)) {
						App.timedout = true;
						clearTimeout(App.intervals.wait_after_click);
						clearTimeout(App.intervals.wait_time);
					}

					if (App.current_window) {
					//	App.current_window.close();
					}

					if (App.current_link >=  App.links_data.length) {
						window.next_proxy();
						App.current_link = 0;
					} else {
						App.current_link++;
					}


					window.App.next = false;

					window.open_window(App.links_data[App.current_link]);

					App.last_window = window.get_time();
				}

				window.update_status();

			}

		}, 1000);


		$("#iniciar_btn").click(function() {
			if ($("#iniciar_btn").html() == "Parar") {
				$("#iniciar_btn").removeClass("loading-cube");
				App.running = false;

				$("#iniciar_btn").html("Continuar");
			} else {
					$("#iniciar_btn").html("Parar");
					$("#iniciar_btn").addClass("loading-cube");

					App.running = true;
					$('#links_textarea').attr("disabled", "disabled");
			}
		});

	});
} catch(err) {
	dialog.showErrorBox("Ops, ocorreu um erro", err.message);
}

window.onerror = function (msg, url, line) {
    dialog.showErrorBox("Ops, ocorreu um erro", msg);
};
