var artistClicked = "";
var artistClickedID = "butt";
var albumsAndIDs = new Object();
var albumClicked = "";
var songs = new Array();
var songPlayingIndex = 0;
var youtubeScriptLoaded = false;
var youtubePlayer;

$(document).ready(function()
{
  var artistList;

  //alert("youtubeScriptLoaded first is " + youtubeScriptLoaded + ".");

  $("#artists").live('pagebeforeshow', function(event, ui)
  {
    albumsAndIDs = new Object();
    if (artistList == null)
    {
      if (localStorage.getItem('artistList'))
      {
      }
      else
      {
        //artistList = new Array();
        artistList = ["Defiance, Ohio", "Modest Mouse", "Waxahatchee", "Peter Green"];
      }
    }
    var listElements = "";
    for (var i = 0; i < artistList.length; i++)
    {
      listElements += '<li><a href="#albums" onclick="artistClicked = \'' + artistList[i] + '\'">' + artistList[i] + '</a></li>';
    }
    $("#artist-list").append(listElements);
    $("#artist-list").listview();
    $("#artist-list").listview('refresh');
  });

  $("#artists").live('pagehide', function(event, ui)
  {
    $("#artist-list").empty(); 
  });

  $("#albums").live('pagebeforeshow', function(event, ui)
  {
    var albumList;
    //artistClicked;
    //artistClickedID;

    songs = new Array();
    // Get artistClickedID
    var url = encodeURIComponent("http://musicbrainz.org/ws/2/artist?query=")
      + encodeURIForMusicbrainz(artistClicked)
      + encodeURIComponent("&limit=1");
    requestXMLCrossDomain(url, function(response)
    {
      artistClickedID = $(response).find('artist').attr("id");
      // Got artistClickedID, now get albums and their IDs
      var url = encodeURIComponent("http://musicbrainz.org/ws/2/release?artist=" + artistClickedID);
      requestXMLCrossDomain(url, function(response)
      {
        $(response).find('release').each(function()
        {
          var albumID = $(this).attr('id');
          var albumName = $(this).find('title').text();
          albumsAndIDs[albumName] = albumID;
        });
        // Populate the unordered list with albums
        var listElements = "";
        for (var albumName in albumsAndIDs)
        {
          listElements += '<li><a href="#songs" onclick="albumClicked = \'' + albumName + '\'">' + albumName + '</a></li>';
        }
        $("#album-list").append(listElements);
        $("#album-list").listview();
        $("#album-list").listview('refresh');
      });
    });
  });

  $("#albums").live('pagehide', function(event, ui)
  {
    $("#album-list").empty();
  });

  $("#songs").live('pagebeforeshow', function(event, ui)
  {
    // Get list of songs
    var url = encodeURIComponent("http://musicbrainz.org/ws/2/recording?release=" + albumsAndIDs[albumClicked]);
    requestXMLCrossDomain(url, function(response)
    {
      $(response).find('recording').each(function()
      {
        var songName = $(this).find('title').text();
        var song = new Object();
        song.name = $(this).find('title').text();
        song.artist = artistClicked;
        songs.push(song);
      });
      var listElements = "";
      for(var i = 0; i < songs.length; i++)
      {
        listElements += '<li data-icon="false"><a href="#" class="song" onclick="songPlayingIndex = \'' + i + '\'">' + songs[i].name + '</a></li>';
      }
      $("#song-list").append(listElements);
      $("#song-list").listview();
      $("#song-list").listview('refresh');
    });
  });

  $("#songs").live('pagehide', function(event, ui)
  {
    $("#song-list").empty();
    songPlaying = false;
    youtubePlayer.stopVideo();
  });

  $("a.song").live('click', function(event, ui)
  {
    var videoID = getVideoID(songs[songPlayingIndex].artist, songs[songPlayingIndex].name);
    alert("videoID " + videoID + ".");
    alert("youtubeScriptLoaded " + youtubeScriptLoaded + ".");
    if (!youtubeScriptLoaded)
    {
      setupYoutubeScript(videoID);
    }
    else
    {
      youtubePlayer.cueVideoById(videoID); 
      youtubePlayer.playVideo();
    }
    //TODO: change play button to pause
  });

  /**
   * Used to get information from musicbrainz.
   * Thanks to Greg for this function.
   * http://stackoverflow.com/questions/4205494/crossdomain-request-with-yql
   * http://jsfiddle.net/HBCDF/1/
   * Accepts a url and a callback function to run.
   */
  function requestXMLCrossDomain(site, callback)
  {
    // If no url was passed, exit.
    if (!site)
    {
      alert('No site was passed.');
      return false;
    }
    // Take the provided url, and add it to a YQL query. Make sure you 
    var yql = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="') + site + '"&callback=?';
    // Request that YSQL string, and run a callback function.
    // Pass a defined function to prevent cache-busting.
    $.getJSON(yql, function(data)
    {
      // If we have something to work with...
      if (data.results[0])
      {
        // Strip out all script tags, for security reasons.
        // BE VERY CAREFUL. This helps, but we should do more.
        data = data.results[0].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        // If the user passed a callback, and it
        // is a function, call it, and send through the data var.
        if (typeof callback === 'function')
          callback(data);
      }
      // Else, Maybe we requested a site that doesn't exist, and nothing returned.
      //else throw new Error('Nothing returned from getJSON.');
      else
        alert("Nothing returned from getJSON!");
    });
  }

  /**
   * Something like "Cats%20are%20nice" doesn't work for some reason.
   * It has to be "Cats%2520are%2520nice"
   * So this encodes input to URI and then adds 25 after every '%'
   */
  function encodeURIForMusicbrainz(input)
  {
    var retval = "";
    input = encodeURIComponent(input);
    for (var i = 0; i < input.length; i++)
    {
      if (input.charAt(i) == "%")
        retval += "%25";
      else
        retval += input.charAt(i);
    }
    return retval;
  }

  function getVideoID(artist, song)
  {
    var videoID = "";
    var uriQuery = encodeURIComponent(artist + song);
    var url = "https://gdata.youtube.com/feeds/api/videos?q=" + uriQuery +
      "&orderby=relevance&start-index=1&max-results=1&paid-content=false&fmt=5&v=2&alt=jsonc";
    alert("Search url: " + url);
    $.getJSON("url", function(response)
    {
      videoID = response.data.items[0].id;
    });
    return videoID;
  }

  function setupYoutubeScript(videoID)
  {
    youtubeVideoID = videoID;
    var tag = document.createElement('script');
    tag.src = "http://www.youtube.com/player_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    alert("Someone ran setupYoutubeScript!!!");
    youtubeScriptLoaded = true;
  }
});

function onYouTubePlayerAPIReady()
{
  alert("onYouTubePlayerAPIReady()");
  youtubePlayer = new YT.Player('youtubePlayer',
  {
    height: "1",
    width: "1",
    videoId: youtubeVideoID,
    events:
    {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
  alert("youtubePlayer created. It is " + youtubePlayer);
}

function onPlayerReady(event)
{
  event.target.playVideo();
}

function onPlayerStateChange(event)
{
  switch (event.data)
  {
    case YT.PlayerState.ENDED:
      alert("Starting next video.");
      // Play the next song, or go back to the beginning
      if (songPlayingIndex == songs.length - 1)
        songPlayingIndex = 0;
      else
        songPlayingIndex++;
      var videoID = getVideoID(songs[songPlayingIndex].artist, songs[songPlayingIndex].song);
      youtubePlayer.cueVideoById(videoID); 
      event.target.playVideo();  
      break;
  }
}
