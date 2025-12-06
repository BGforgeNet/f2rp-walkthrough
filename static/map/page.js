var data;
var lastTile;

$(document).ready(function() {
    //console.log('init');
    data = $.ajax('worldmap.json', {dataType: 'json', success: function(res) {
        var i, j;
        data = res;
        if (!data || !data.tiles) {
            alert('Error loading data!');
            return;
        }
        //$('.tiles-block').empty();
        /*for (i=0; i<data.num_rows; i++) for (j=0; j<data.num_cols; j++) $('.tiles-block').append('<div data-x="'+j+'" data-y="'+i+'" class="tile"></div>');*/
        /*$('.tiles-block .tile').click(function() {
            if (lastTile != this) {
                $('.info-block').html(getDataForTile(this));
                $('.info-block ul li a').click(function() {
                    alert($(this).attr('title'));
                })
                $('.tiles-block .tile').removeClass('sel');
                $(this).addClass('sel');
            }
            lastTile = this;
        })*/
        
        $('.tiles-block').mousemove(function(e) {
            var p = getTilePos(e);
            $('.tiles-block .hover').css(getTilePosCSS(p)).html(data.tiles[p.x][p.y].type);
        });
        $('.tiles-block').click(function(e) {
            var p, tile;
            p = getTilePos(e);
            $('.tiles-block .selection').show().css(getTilePosCSS(p));
            $('#database').hide();
            $('#tile_info').show();
            $('#tile_info .main').html(getDataForTile(p));
            $('#tile_info .encs').html(getEncountersForTile(p));
            $('#tile_info .encs').scrollTop(0);
        });
        $('.info-block').on('click', '.encs ul li a', function() {
            if ($(this).attr('title')) alert($(this).attr('title'));
        });
        
        var countKeys = function(o) { var i=0; for (var k in o) i++; return i; }
        var fA = function(func) { return ' <a href="javascript:;" onclick="'+func+'()">Show</a>'; }
        var s = 'Database contents:<br>';
        s += 'Tiles: '+data.num_cols+'x'+data.num_rows+' (total '+(data.num_cols*data.num_rows)+')<br>';
        s += 'Encounter tables: '+countKeys(data.enc_tables)+ fA('showEncTablesData') +'<br>';
        s += 'Encounter types: '+countKeys(data.enc_types)+ fA('showEncTypesData') +'<br>';
        $('#database .main').html(s);
        
        $('.database-link').click(function(e) {
            clearTiles();
            $('#tile-data').hide();
            $('#database').show();
            showEncTablesData();
        });
        $('.info-block-close').click(function(e) {
            $('.info-block').hide();
        });
    }});
    
    $(document).keypress(function(e) {
        if (e.keyCode == 27) clearTiles();
    });
});

function clearTiles() {
    $('.tiles-block .show-type, .tiles-block .show-freq').remove();
}

var getTilePos = function(e) {
    var ofs = $('.tiles-block').offset();
    return {x: Math.min(Math.floor((e.pageX - ofs.left) / 50), data.num_cols-1),
            y: Math.min(Math.floor((e.pageY - ofs.top) / 50), data.num_rows-1)};
}
var getTilePosCSS = function(p) {
    return {left: (p.x*50)+'px', top: (p.y*50)+'px'};
}

window.onresize = function() {
    //$('.info-block').css('height', 'px');
}

function showEncTablesData() {
    var s = '<ul>';
    for (var k in data.enc_tables) {
        s += '<li><a href="javascript:;" onclick="showTiles(\''+k+'\')">'+k+'</a></li>';
    }
    s += '</ul>';
    $('#database .encs').html(s).scrollTop(0);
}

function showEncTypesData() {
    var s = '<ul>', title;
    for (var k in data.enc_types) {
        title = getEncounterTypeInfo(data.enc_types[k]);
        s += '<li><a href="javascript:;" title="'+title+'" onclick="showTiles(\''+k+'\',null,1)">'+k+'</a></li>';
    }
    s += '</ul>';
    $('#database .encs').html(s).scrollTop(0);
}


function getDataForTile(p) {
    var table, s = "", enc, tile;
    //x = Number($(div).attr('data-x'));
    //y = Number($(div).attr('data-y'));
    tile = data.tiles[p.x][p.y];
    table = data.enc_tables[tile.type];
    //alert(JSON.stringify(table));
    s += 'Pos: (' + p.x + ', ' + p.y + ')<br>';
    s += 'Origin: ' + tile.origin + '<br>';
    //s += 'Type: <a href="javascript:;" onclick="showType(\''+tile.type+'\')">' + tile.type + '</a>&nbsp<a href="javascript:;" onclick="showType()">Show all</a><br>';
    s += 'Type: <b>' + tile.type + '</b><br>';
    s += 'Terrain: ' + tile.terrain + '<br>';
    s += 'Difficulty: ' + tile.difficulty + '<br>';
    var fA = function(type, tod, text) { return ' <a href="javascript:;" onclick="showTiles(\''+type+'\',\''+tod+'\')">'+text+'</a>'; }
    s += 'Morning chance: ' + tile.morning_chance + fA(tile.type, 'morning', 'Show Type') + fA('', 'morning', 'Show All')+ '<br>';
    s += 'Afternoon chance: ' + tile.afternoon_chance + fA(tile.type, 'afternoon', 'Show Type') + fA('', 'afternoon', 'Show All') + '<br>';
    s += 'Night chance: ' + tile.night_chance + fA(tile.type, 'night', 'Show Type') + fA('', 'night', 'Show All') + '<br>';
    s += 'Encounters:';
    return s;
}

function getEncounterTypeInfo(typeDef) {
    var title;
    if (!typeDef) return '';
    title = typeDef.position +', critters:\n';
    for (k in typeDef.types) {
        title += typeDef.types[k].desc + '\n';
    }
    return title;
}

function getEncountersForTile(p) {
    var table, s = "<ul>", k, enc, tile;
    tile = data.tiles[p.x][p.y];
    table = data.enc_tables[tile.type];
    var injectUrls = function(str, types) {
        var i, k, pos, title;
        for (i=0; i<types.length; i++) {
            var pos = str.indexOf(types[i]);
            if (pos != -1) {
                title = getEncounterTypeInfo(data.enc_types[types[i]]);
                str = str.substr(0, pos) + '<a href="javascript:;" title="'+title+'" onclick="showTiles(\''+types[i]+'\',null,1)">'+ types[i] +'</a>'+str.substr(pos + types[i].length);
            }
        }
        return str;
    }
    for (k in table.encs) {
        enc = table.encs[k];
        s += "<li><b>" + enc.chance + "%</b> - " + injectUrls(enc.enc, enc.types);
        if (enc.map) s += " ("+ enc.map +")";
        if (enc.cond) s += '<br><b>Cond</b>: '+enc.cond;
        s += "</li>";
    }
    s += "</ul>";
    return s;
}

function showTiles(type, timeOfDay, isEnc) {
    var i, j, k, bl, p, opac, show, table, maxChance, isFirst = true;
    if (!timeOfDay) timeOfDay = 'morning';
    clearTiles();
    bl = $('.tiles-block');
    var opacityMap = {undefined:0.0,'None':0.0, 'Rare':0.15, 'Uncommon':0.3, 'Common':0.45, 'Frequent':0.6, 'Forced':1.0};
    //var addonMap = {undefined:'','None':'', 'Rare':'&#9601;&#9601;', 'Uncommon':'&#9602;&#9602;', 'Common':'&#9604;&#9604;', 'Frequent':'&#9605;&#9605;', 'Forced':'&#9608;&#9608;'};
    for (i=0; i<data.num_cols; i++) for (j=0; j<data.num_rows; j++) {
        show = (!type || !isEnc && data.tiles[i][j].type == type);
        if (!show) {
            table = data.enc_tables[data.tiles[i][j].type];
            maxChance = 0;
            if (table) for (k in table.encs) if (table.encs[k].types.indexOf(type) != -1) {
                if (table.encs[k].chance > maxChance) maxChance = table.encs[k].chance;
                show = true;
            }
        }
        if (show) {
            /*if (isFirst) {
                $(window).scrollTop(bl.offset().top + j*50);
                isFirst = false;
            }*/
            p = getTilePosCSS({x: i, y: j});
            p = 'left:'+p.left+';top:'+p.top+ ';';
            bl.append('<div class="show-type" style="'+ p +'">' + data.tiles[i][j].type + '</div>');
            opac = opacityMap[data.tiles[i][j][timeOfDay+'_chance']];
            if (isEnc) opac = (maxChance > 0) ? Math.min(opac * 4 * maxChance / 100, 1.0) : 0;
            bl.append('<div class="show-freq" style="'+ p + 'opacity:' + opac + '"></div>');
        }
    }
}