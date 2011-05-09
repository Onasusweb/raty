/**
 * jQuery Raty - A Star Rating Plugin - http://wbotelhos.com/raty
 * ---------------------------------------------------------------------------------
 *
 * jQuery Raty is a plugin that generates a customizable star rating automatically.
 *
 * Licensed under The MIT License
 *
 * @version			1.4.0
 * @since			06.11.2010
 * @author			Washington Botelho dos Santos
 * @documentation	http://wbotelhos.com/raty
 * @twitter			http://twitter.com/wbotelhos
 * @license			http://opensource.org/licenses/mit-license.php
 * @package			jQuery Plugins
 *
 * Usage with default values:
 * ---------------------------------------------------------------------------------
 * $('#star').raty();
 *
 * <div id="star"></div>
 *
 *
 * $('.group').raty();
 *
 * <div class="group"></div>
 * <div class="group"></div>
 * <div class="group"></div>
 *
 */

;(function($) {

	$.fn.raty = function(settings) {
		options = $.extend({}, $.fn.raty.defaults, settings);

		if (this.length == 0) {
			debug('Selector invalid or missing!');
			return;
		} else if (this.length > 1) {
			return this.each(function() {
				$.fn.raty.apply($(this), [settings]);
			});
		}

		if (options.number > 20) {
			options.number = 20;
		} else if (options.number < 0) {
			options.number = 0;
		}

		if (options.path.substring(options.path.length - 1, options.path.length) != '/') {
			options.path += '/';
		}

		var $this		= $(this),
			id			= this.attr('id'),
			start		= 0,
			starFile	= options.starOn,
			hint		= '',
			target		= options.target,
			width		= (options.width) ? options.width : (options.number * options.size + options.number * 4);

		$this.data('options', options);

		if (id == '') {
			id = 'raty-' + $this.index();
			$this.attr('id', id); 
		}

		if (!isNaN(options.start) && options.start > 0) {
			start = (options.start > options.number) ? options.number : options.start;
		}

		for (var i = 1; i <= options.number; i++) {
			starFile = (start >= i) ? options.starOn : options.starOff;

			hint = (i <= options.hintList.length && options.hintList[i - 1] !== null) ? options.hintList[i - 1] : i;

			$this
			.append('<img id="' + id + '-' + i + '" src="' + options.path + starFile + '" alt="' + i + '" title="' + hint + '" class="' + id + '"/>')
			.append((i < options.number) ? '&nbsp;' : '');
		}

		if (options.iconRange && start > 0) {
			fillStar(id, start, options);	
		}

		var $score = $('<input/>', {
			id:		id + '-score',
			type:	'hidden',
			name:	options.scoreName
		}).appendTo($this);

		if (start > 0) {
			$score.val(start);
		}

		if (options.half) {
			splitStar($this, $('input#' + id + '-score').val(), options);
		}

		if (!options.readOnly) {
			if (target !== null) {
				target = $(target);

				if (target.length == 0) {
					debug('Target selector invalid or missing!');
				}
			}

			if (options.cancel) {
				var star	= $('img.' + id),
					cancel	= '<img src="' + options.path + options.cancelOff + '" alt="x" title="' + options.cancelHint + '" class="button-cancel"/>',
					opt		= options;

				if (opt.cancelPlace == 'left') {
					$this.prepend(cancel + '&nbsp;');
				} else {
					$this.append('&nbsp;').append(cancel);
				}

				$('#' + id + ' img.button-cancel').mouseenter(function() {
					$(this).attr('src', opt.path + opt.cancelOn);
					star.attr('src', opt.path + opt.starOff);
					setTarget(target, '', opt);
				}).mouseleave(function() {
					$(this).attr('src', opt.path + opt.cancelOff);
					star.mouseout();
				}).click(function(evt) {
					$('input#' + id + '-score').removeAttr('value');

					if (opt.click) {
			          opt.click.apply($this, [null, evt]);
			        }
				});

				$this.css('width', width + options.size + 4);
			} else {
				$this.css('width', width);
			}

			$this.css('cursor', 'pointer');
			bindAll($this, options, target);
		} else {
			$this.css('cursor', 'default');
			fixHint($this, start, options);
		}

		return $this;
	};
	
	function bindAll(context, options, target) {
		var id		= context.attr('id'),
			score	= $('input#' + id + '-score'),
			qtyStar	= $('img.' + id).length;

		// context.
		$('#' + id).mouseleave(function() {
			initialize(context, score.val(), options);
			clearTarget(target, score, options);
		});

		$('img.' + id).bind(((options.half) ? 'mousemove' : 'mouseover'), function(e) {
	        fillStar(id, this.alt, options);

			if (options.half) {
				var percent = parseFloat(((e.pageX - $(this).offset().left) / options.size).toFixed(1));
				percent = (percent >= 0 && percent < 0.5) ? 0.5 : 1;

				context.data('score', parseFloat(this.alt) + percent - 1);

				splitStar(context, context.data('score'), options);
			} else {
				fillStar(id, this.alt, options);
			}

			setTarget(target, this.alt, options);
		}).click(function(evt) {
			score.val(options.half ? context.data('score') : this.alt);

			if (options.click) {
				options.click.apply(context, [score.val(), evt]);
			}
		});
	};

	function clearTarget(target, score, options) {
		if (target !== null) {
			var value = '';

			if (options.targetKeep) {
				value = score.val();

				if (options.targetType == 'hint') {
					if (score.val() == '' && options.cancel) {
						value = options.cancelHint;
					} else {
						value = options.hintList[Math.ceil(score.val()) - 1];
					}
				}
			}

			if (isField(target)) {
				target.val(value);
			} else {
				target.html(value);
			}
		}
	};

	function getContext(value, idOrClass, name) {
		var context = undefined;

		if (idOrClass == undefined) {
			debug('Specify an ID or class to be the target of the action.');
			return;
		}

		if (idOrClass) {
			if (idOrClass.indexOf('.') >= 0) {
				var idEach;

				return $(idOrClass).each(function() {
					idEach = '#' + $(this).attr('id');

					if (name == 'start') {
						$.fn.raty.start(value, idEach);
					} else if (name == 'click') {
						$.fn.raty.click(value, idEach);
					} else if (name == 'readOnly') {
						$.fn.raty.readOnly(value, idEach);
					}
				});
			}

			context = $(idOrClass);

			if (!context.length) {
				debug('"' + idOrClass + '" is a invalid identifier for the public funtion $.fn.raty.' + name + '().');
				return;
			}
		}

		return context;
	};

	function debug(message) {
		if (window.console && window.console.log) {
			window.console.log(message);
		}
	};

	function fillStar(id, score, options) {
		var qtyStar	= $('img.' + id).length,
			item	= 0,
			range	= 0,
			star,
			starOn;

		for (var i = 1; i <= qtyStar; i++) {
			star = $('img#' + id + '-' + i);

			if (i <= score) {
				if (options.iconRange && options.iconRange.length > item) {

					starOn = options.iconRange[item][0];
					range = options.iconRange[item][1];

					if (i <= range) {
						star.attr('src', options.path + starOn);
					}

					if (i == range) {
						item++;
					}
				} else {
					star.attr('src', options.path + options.starOn);
				}
			} else {
				star.attr('src', options.path + options.starOff);
			}
		}
	};

	function fixHint(context, score, options) {
		if (score != 0) {
			score = parseInt(score);
			hint = (score > 0 && options.number <= options.hintList.length && options.hintList[score - 1] !== null) ? options.hintList[score - 1] : score;
		} else {
			hint = options.noRatedMsg;
		}

		$('#' + context.attr('id')).attr('title', hint).children('img').attr('title', hint);
	};

	function isField(target) {
		return target.is('input') || target.is('select') || target.is('textarea');
	};

	function initialize(context, score, options) {
		var id = context.attr('id');

		if (isNaN(parseInt(score))) {
			$('input#' + id + '-score').removeAttr('value');
		} else if (score < 0) {
			score = 0;
		} else if (score > options.number) {
			score = options.number;
		}

		fillStar(id, score, options);

		if (score > 0) {
			$('input#' + id + '-score').val(score);

			if (options.half) {
				splitStar(context, score, options);
			}
		}

		if (options.readOnly || context.css('cursor') == 'default') {
			fixHint(context, score, options);
		}
	};

	function setTarget(target, alt, options) {
		if (target !== null) {
			var value = alt;

			if (options.targetType == 'hint') {
				if (alt == 0 && options.cancel) {
					value = options.cancelHint;
				} else {
					value = options.hintList[alt - 1];
				}
			}

			if (isField(target)) {
				target.val(value);
			} else {
				target.html(value);
			}
		}
	};

	function splitStar(context, score, options) {
		var id		= context.attr('id'),
			rounded	= Math.ceil(score),
			diff	= (rounded - score).toFixed(1);

		if (diff > 0.25 && diff <= 0.75) {
			rounded = rounded - 0.5;
			$('img#' + id + '-' + Math.ceil(rounded)).attr('src', options.path + options.starHalf);
		} else if (diff > 0.75) {
			rounded--;
		} else {
			$('img#' + id + '-' + rounded).attr('src', options.path + options.starOn);
		}
	};

	$.fn.raty.click = function(score, idOrClass) {
		var context = getContext(score, idOrClass, 'click'),
			options = $(idOrClass).data('options');

		initialize(context, score, options);

		if (options.click) {
			options.click.apply(context, [score]);
		} else {
			debug('You must add the "click: function(score, evt) { }" callback.');
		}

		return $.fn.raty;
	};

	$.fn.raty.readOnly = function(boo, idOrClass) {
		var context	= getContext(boo, idOrClass, 'readOnly'),
			cancel	= context.children('img.button-cancel'),
			options	= $(idOrClass).data('options');

		if (cancel[0]) {
			(boo) ? cancel.hide() : cancel.show();
		}

		if (boo) {
			$('img.' + context.attr('id')).unbind();
			context.css('cursor', 'default').unbind();
		} else { 
			bindAll(context, options);
			context.css('cursor', 'pointer');
		}

		return $.fn.raty;
	};

	$.fn.raty.start = function(score, idOrClass) {
		var context = getContext(score, idOrClass, 'start'),
			options = $(idOrClass).data('options');

		initialize(context, score, options);

		return $.fn.raty;
	};

	$.fn.raty.defaults = {
		cancel:			false,
		cancelHint:		'cancel this rating!',
		cancelOff:		'cancel-off.png',
		cancelOn:		'cancel-on.png',
		cancelPlace:	'left',
		click:			null,
		half:			false,
		hintList:		['bad', 'poor', 'regular', 'good', 'gorgeous'],
		noRatedMsg:		'not rated yet',
		number:			5,
		path:			'img/',
		iconRange:		[],
		readOnly:		false,
		scoreName:		'score',
		size:			16,
		starHalf:		'star-half.png',
		starOff:		'star-off.png',
		starOn:			'star-on.png',
		start:			0,
		target:			null,
		targetKeep:		false,
		targetType:		'hint',
		width:			null
	};

})(jQuery);