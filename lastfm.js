'use strict';

(function(jQuery){
	var items = [];
	var artistTitles = [];
	var settings;
	var page = 0;
	var timer = undefined;
	jQuery.fn.lastfm = function(options) {
		var defaults = {
			username: '[Last.fm Account]',
			apikey: '[Last.fm API Key]',
			interval: 1000,
			reload: 600000,
			limit: 50,
			default_count: 5,
			page_count: 5,
			onComplete: function(){}
		};
		settings = jQuery.extend({}, defaults, options);
		if(settings.default_count>settings.page_count) settings.page_count = settings.default_count;
		if(settings.page_count>settings.limit) settings.limit = settings.page_count;
		var thisElem = jQuery(this);
		thisElem.after('<div id="more_track" />');
		thisElem.getRecentTracks();
	}

	jQuery.fn.getRecentTracks = function() {
		var eachfuncs = {
			relativeTime: function(ust) {
				var parsed_date = ust;
				var relative_to = (new Date().getTime()/1000);
				var delta = relative_to-parsed_date;
				if(delta<60) {
				//	return delta.toString()+'秒前';
					return "<img src=\"http://girled.net/js/lastfm/eq.gif\" alt=\"再生中\" width=\"12\" height=\"12\" /> 再生中";
				} else if(delta<(60*3)) {
					return "<img src=\"http://girled.net/js/lastfm/eq.gif\" alt=\"再生中\" width=\"12\" height=\"12\" /> 再生中";
				} else if(delta<(60*60)) {
					return (parseInt(delta/60)).toString() + '分前';
				} else if(delta<(24*60*60)) {
					return (parseInt(delta/3600)).toString() + '時間前';
				} else {
					return (parseInt(delta/86400)).toString() + '日前';
				}
			}
			,stripSlashes: function(str) {
				return (str+'').replace(/\0/g, '0').replace(/\\([\\'"])/g, '$1');
			}
			,elapsedTime: function(elem) {
				return elem.find('.ctime').each(function() {
					var ptime = jQuery(this).html();
					var etime = eachfuncs.relativeTime(jQuery(this).data('datetime'));
					if(ptime!=etime) jQuery(this).css('opacity', 0.0).html(etime).fadeTo('normal', 1.0);
				});
			}
			,printContent: function(elem, item) {
				var thisElem = elem;
				if(item==undefined) return false;
				var art = (item.image!=undefined && item.image[0]['#text']!=undefined && item.image[0]['#text']!='')?eachfuncs.stripSlashes(item.image[0]['#text']):'http://girled.net/js/lastfm/noimg_lfm.gif'
				,url = (eachfuncs.stripSlashes(item.url)!=undefined)?eachfuncs.stripSlashes(item.url):"http://girled.net/"
				,song = (item.name!=undefined)?item.name:"unknown title"
				,artist = (item.artist!=undefined && item.artist['#text']!=undefined)?item.artist['#text']:"unknown artist"
				,album = (item.album!=undefined && item.album['#text']!=undefined)?item.album['#text']:"unknown album"
				,date = (item.date!=undefined)?item.date['#text']:""
				,utsstr = (item.date!=undefined && item.date.uts!=undefined)?eachfuncs.relativeTime(item.date.uts):""
				,nowplaying = (item['@attr']!=undefined && item['@attr'].nowplaying!=undefined)?"<img src=\"http://girled.net/js/lastfm/eq.gif\" alt=\"再生中\" width=\"12\" height=\"12\" /> 再生中":""
				,datetime = (item.date!=undefined && item.date.uts!=undefined)?item.date.uts:parseInt(new Date().getTime()/1000)
				;
				var thisIndex = artistTitles.length;
				artistTitles[thisIndex] = new Array(artist, song);
				thisElem.append(
					'<div id="atrack-'+thisIndex+'" style="clear:both;">'
					+'<div class="ctime" data-datetime="'+datetime+'">'+nowplaying+utsstr+'</div>'
					+'<a href="'+url+'" title="'+artist+' - '+song+'" target="_blank"><img src="'+art+'" class="widget-img-thumb" alt="'+artist+' - '+song+'" width="32" height="32" onerror="this.src=(\'http://girled.net/js/lastfm/noartwork.gif\')"></a>'
					+'<a href="'+url+'" title="'+artist+' - '+song+'" target="_blank">'+((song.length>32)?song.slice(0, 32)+'...':song)+'</a><br />'
					+'<a href="'+url+'" title="'+artist+' - '+song+'" target="_blank">'+((artist.length>32)?artist.slice(0, 32)+'...':artist)+'</a>'
					//+album
					+'<div class="alist" style="clear:both;"></div>'
					+'<div class="ainfo" style="text-align:right;clear:both;opacity:0.2;"><a href="" onclick="jQuery(this).closest(\'#atrack-'+thisIndex+'\').productSearch('+thisIndex+', 1);return false;">[Amazonで検索]</a></div>'
					+'</div>'
				);
				thisElem.children('#atrack-'+thisIndex).hover(
					function() {jQuery(this).children('.ainfo').fadeTo('normal', 1.0);}
					,function() {jQuery(this).children('.ainfo').fadeTo('normal', 0.2);}
				);
				thisElem.fadeTo('normal', 1.0);
			}
			,shiftItems: function(elem) {
				for(var i=0; i<settings.page_count; i++) {
					eachfuncs.printContent(elem, items.shift());
					if(items.length<=0) break;
				}
				eachfuncs.elapsedTime(thisElem);
				jQuery('#more_track').empty().append('<div style="text-align:right;"><a href="" onmouseover="jQuery(\'#lastfm\').getRecentTracks();return false;">[さらに読み込む]</a></div>');
			}
			,eachThis: function(elem) {
				var thisElem = elem;
				jQuery('#more_track').empty().append('<div style="text-align:right;"><img src="http://girled.net/indi.gif" alt="読み込み中..." width="10px" height="10px" /> 読み込み中...</div>');
				var thisPage = page;
				if(thisPage>=1 && items.length>=settings.page_count) {
					thisElem.append('<div class="track" style="opacity:0.0;" />');
					var trackElem = thisElem.children('.track:last');
					eachfuncs.shiftItems(trackElem);
				} else {
					var params = {
						method: 'user.getrecenttracks',
						user: settings.username,
						api_key: settings.apikey,
						limit: (page==0)?settings.default_count:settings.limit,
						page: (page==0)?1:thisPage,
						format: 'json',
					};
					return jQuery.ajax({
						url: 'http://ws.audioscrobbler.com/2.0/',
						data: params,
						dataType: 'jsonp',
						callback: 'callback',
						timeout: 5000,
						success: function(data, status) {
							if(data==undefined || data.recenttracks==undefined) {
								jQuery('#more_track').empty();
								return false;
							}
							if(thisPage==0 || thisPage==1) items = [];
							items = items.concat(data.recenttracks.track);
							if(thisPage==1) items.splice(0, settings.default_count);
							if(thisPage==0) thisElem.empty();
							thisElem.append('<div class="track" style="opacity:0.0;" />');
							var trackElem = thisElem.children('.track:last');
							eachfuncs.shiftItems(trackElem);
							page++;
						},
						error: function(XHR, status, errorThrown) {
							eachfuncs.elapsedTime(thisElem);
							jQuery('#more_track').empty();
						}
					});
				}
			}
		}
		;
		var thisElem = jQuery(this);
		eachfuncs.eachThis(thisElem);
		var dTime = new Date().getTime();
		if(timer!=undefined) clearInterval(timer);
		timer = setInterval(function() {
			if(dTime+settings.reload < (new Date().getTime())) {
				page = 0;
				eachfuncs.eachThis(thisElem);
				dTime = new Date().getTime();
			}
		}, settings.interval);
	}

	jQuery.fn.productSearch = function(trackNum, pageNum) {
		var amazon = {
			productSearchComplete: function(data, elem, pageNum) {
				var thisElem = elem;
				var total_results = (data.result.TotalResults>=100)?100:data.result.TotalResults;
				if(total_results-(pageNum*10)>0) thisElem.children('.ainfo').empty().append('<a href="" onclick="jQuery(this).closest(\'#atrack-'+trackNum+'\').productSearch('+trackNum+', '+(pageNum+1)+');return false;">[検索結果あと'+(total_results-(pageNum*10))+'件]</a>');
				else thisElem.children('.ainfo').empty();
				thisElem.children('.alist').append('<div class="apage" />');
				var thisPage = thisElem.children('.alist').children('.apage:last');
				thisPage.css('opacity', 0.0).fadeTo('normal', 1.0);
				var resultArtistTitles = [];
				if(data.result.Item==undefined) return false;
				if(data.result.Item.length!=undefined) resultArtistTitles = data.result.Item;
				else resultArtistTitles[0] = data.result.Item;
				return jQuery.each(resultArtistTitles, function(i, item){
					var name = item.ItemAttributes.Title
					,artist = item.ItemAttributes.Artist
					,url = item.DetailPageURL
					,image = item.SmallImage ? item.SmallImage.URL : ''
					,artistName = (artist!=undefined)?artist+" - "+name:name
					;
					if(image==undefined || image=="") image = "http://girled.net/js/lastfm/noimg_ama.gif";
					thisPage.append(
						'<a href="'+decodeURIComponent(url)+'" title="'+artistName+'" target="_blank">'
						+'<img src="'+image+'" class="widget-img-thumb" alt="'+artistName+'" width="32" height="32" />'
						+'</a>'
					);	
				});
			}
		}
		var thisElem = jQuery(this);
		thisElem.children('.ainfo').empty().append('<img src="http://girled.net/indi.gif" alt="商品検索中..." width="10px" height="10px" /> 商品検索中...');
		var params = {
			'search_index': 'Music',
			'artist': artistTitles[trackNum][0],
			'title': artistTitles[trackNum][1],
			'item_page': pageNum,
		};
		jQuery.ajax({
			url: 'http://girled.net/js/lastfm/amazon/request.php',
			data: params,
			dataType: 'jsonp',
			callback: 'callback',
			timeout: 5000,
			success: function(data, status) {
				amazon.productSearchComplete(data, thisElem, pageNum);
			},
			error: function(XHR, status, errorThrown) {thisElem.children('.ainfo').empty();}
		});
		return thisElem;
	}
})(jQuery);
