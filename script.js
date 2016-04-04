window.gui = require('nw.gui');
window.win = gui.Window.get();
window.fs = require('fs');

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
	started: false,
	proxy_file_name: "",
	interval: null,
	next: false,
	last_window: new Date().getTime(),
	current_window: null,
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
		});

		$("#links_textarea").bind('input propertychange', function() { 
			window.get_links();
		});

		$('#links_textarea').on('paste', function () {
			window.get_links();
		});

		$("#proxy_file_list input").change(function() {
			setTimeout( function(){
				var file_name = $("#proxy_file").val();
				localStorage.setItem("proxy_list", file_name);
				window.read_proxy_list(file_name);
			}, 1);
		});

		window.change_proxy = function(proxy) {
			proxy = String(proxy).trim();
			//gui.App.setProxyConfig(proxy);
			App.current_proxy = proxy;
		};

		window.next_proxy = function() {
			if (!App.proxy_data) {
				throw "Nenhuma lista de Proxy's carregada";
			}

			change_status("Alterando proxy...");
			App.current_proxy = App.proxy_data[App.current_proxy_no];
			change_proxy(App.current_proxy);
			App.current_proxy_no++;
			console.log(App.current_proxy);
			change_status("Proxy Alterado");

			if (App.current_proxy_no >= App.proxy_data.length) {
				App.current_proxy = "0.0.0.0:00";
				App.done = true;
				clearInterval(App.interval);
				change_status("Lista de Proxy completa");
				setTimeout(function() {
					change_status("Lista de Proxy completa");
				}, 5000);
				
			}
		};

		window.read_proxy_list = function(filename, callback) {
			window.fs.readFile(filename, "utf8", function (err, data) {
	            if (err) {
	            	throw ("Erro ao abrir o arquivo " + filename);
	            	console.log("Erro ao abrir o arquivo " + filename);
	            	console.log(err);
	            } else {
	            	App.proxy_data = data;
	            	change_status("Carregando lista de Proxy's");
	            	App.proxy_data = App.proxy_data.split('\n');
            		change_status("Pronto");
            		callback();
				}
	        });
		};

		window.open_window = function(url) {
			var _win = nw.Window.open(url, {}, function(win) {
				App.current_window = win;

				change_status("Aguardando carregamento");

				win.window.document.addEventListener("DOMContentLoaded", function() {
					setTimeout(function() {
						change_status("Clicando no link");
						try {
							win.window.document.querySelector("#skip_button").click();
						} catch(err) {
							console.log("Não encontrou link Skip button");
						}
						setTimeout(function() {
							change_status("Aguardando para fechar");
							win.close();
							window.App.clicks_no++;
							window.App.next = true;
						}, 4000);
					}, 7000);
				}, false);

			

			});
		};

		window.close = function() {
			gui.App.quit();
		};


		(function init() {
			gui.App.clearCache();

			
			App.proxy_file_name = localStorage.getItem("proxy_list");

			if (!!App.proxy_file_name) {
				var file_name = App.proxy_file_name.split("\\");
				file_name = file_name[file_name.length - 1];
				$(document).find("#proxy_file_list input[type=text]").val(file_name);
			}

			window.read_proxy_list(App.proxy_file_name, function() {
				window.next_proxy();
				change_status("Pronto");
			});

			window.get_links();
			window.update_status();

			window.App.next = true;
		}());

		

		$("#iniciar_btn").click(function() {
			if ($("#iniciar_btn").html() == "Iniciar") {
				$("#iniciar_btn").html("Parar");
				$("#iniciar_btn").addClass("loading-cube");

				App.started = true;
				$('#links_textarea').attr("disabled", "disabled");
				
				window.App.interval = setInterval(function() {
					
					if (App.done == false && window.App.next || (window.get_time() - App.last_window  > App.timeout) ) {
						
						if (App.current_link >=  App.links_data.length) {
							window.next_proxy();
							App.current_link = 0;
						} 

						App.last_window = window.get_time();
						window.App.next = false;
						if (App.current_window) {
							App.current_window.close();
						}

						window.open_window(App.links_data[App.current_link]);

						App.current_link++;
					}

					window.update_status();
				}, 500);

			} else if($("#iniciar_btn").html() == "Parar") {
				$("#iniciar_btn").removeClass("loading-cube");
				App.done = true;
				clearInterval(App.interval);

				$("#iniciar_btn").html("Reiniciar");
			} else {
				gui.Window.reload();
			}

		});

	});
} catch(err) {
	alert("Erro " + err.message);
}