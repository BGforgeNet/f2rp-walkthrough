# from __future__ import 
import os
import json
import configparser
import re
import itertools
import argparse

# parser = argparse.ArgumentParser(description='Parse worldmap.txt into more organized json format.')
# parser.add_argument('integers', metavar='N', type=int, nargs='+',
                   # help='an integer for the accumulator')
# parser.add_argument('--sum', dest='accumulate', action='store_const',
                   # const=sum, default=max,
                   # help='sum the integers (default: find the max)')


                   
#exit(1)

print("World map parser v0.1")

inFilename = 'worldmap.txt'
outFilename = 'worldmap.json'

print('Loading %s...' % inFilename)

config = configparser.ConfigParser(allow_no_value = True, strict = False, interpolation = None, inline_comment_prefixes = (';'))
config.read(inFilename)

num_horiz = int(config['Tile Data']['num_horizontal_tiles'])

TILE_WIDTH = 7
TILE_HEIGHT = 6

sections = config.sections()
totalTiles = 0
sectionName = "Tile 0"
while sectionName in sections:
    totalTiles+=1
    sectionName = "Tile %d" % totalTiles
    
num_cols = TILE_WIDTH*num_horiz
num_rows = TILE_HEIGHT*(totalTiles // num_horiz)

print("World size is %dx%d tiles" % (num_cols, num_rows))

tiles = [];
#col = itertools.repeat(None, num_rows)
for i in range(0, num_cols):
    tiles.append(list(itertools.repeat(None, num_rows)))

enc_types = {}
enc_tables = {}

def parse_enc_desc(enc):
    # examples:
    #   (2-6) Bounty_Hunter_High AMBUSH Player
    #   (6-8) RDRC_Broken_Hills_Caravan FIGHTING (6-8) RDRC_Raiders
    #   (2-4) ARRO_Spore_Plants AND (1-2) ARRO_Silver_Geckos FIGHTING Player
    # match = re.search('\((\d+)\-(\d+)\)\s(\w+)')
    # ok, let's keep it simple for now (we only need participating parties)
    return [name for name in re.findall('[A-Za-z]\w+', enc) if name.upper() not in ['FIGHTING','AND','AMBUSH','PLAYER','SPECIAL1']]
    
def parse_critter_type(item):
    # examples:
    #   ratio:10%, pid:16777424, Item:273, Item:4, Item:(0-10)41, Script:765
    #   ratio:10%, pid:16777420, Item:4(wielded), Script:620
    #   pid:16777434, Item:9(wielded), Item:40, Item:(0-10)41, Script:258, If (Rand(15%))
    # match = re.search('\((\d+)\-(\d+)\)\s(\w+)')
    # ok, let's keep it simple for now (we only need participating parties)
    # [i.split(':') for i in item.split(',')]:
    def parse_item_def(val):
        m = re.match('(\([\d-]+\))?(\d+)(\(\w+\))?', val, re.I)
        if not(m): return None
        gr = m.groups()
        it = {'pid':int(gr[1])}
        m = re.match('\((\d+)\-(\d+)\)', gr[1]) if gr[1] else None
        if (m):
            it['min'] = int(m.group(1))
            it['max'] = int(m.group(2))
        if (gr[2] and gr[2].lower() == '(wielded)'):
            it['wield'] = True
        return it
        
    type = {'items': [], 'desc': item}
    for kv in [i.split(':') for i in item.split(',')]:
        if (len(kv) == 1 and re.match('\s*If', kv[0])): type['cond'] = kv[0].strip()
        elif (len(kv) == 2): 
            k = kv[0].strip().lower()
            if k in ('ratio', 'pid', 'script'):
                type[k] = int(re.match('\d+', kv[1]).group(0)) if re.match('\d+', kv[1]) else 0
            elif k == 'item':
                it = parse_item_def(kv[1])
                if (it): type['items'].append(it)
            else:
                type[k] = kv[1]
    return type
    
    
def parse_enc(item):
    enc = {}
    for kv in [i.split(':') for i in item.split(',')]:
        #print(kv)
        if (len(kv) == 1 and re.match('\s*If', kv[0])): enc['cond'] = kv[0].strip()
        elif (len(kv) == 2): 
            k = kv[0].lower()
            if k == 'enc':
                enc['types'] = parse_enc_desc(kv[1])
            if k == 'chance':
                enc[k] = int(re.match('\d+', kv[1]).group(0)) if re.match('\d+', kv[1]) else 0
            else:
                enc[k] = kv[1]
    return enc
    

tx = ty = 0
for sectionName in config.sections():
    matchSec = re.search("Tile\s(\d+)", sectionName)
    if matchSec:
        # parse tile definition
        tileNum = int(matchSec.group(1))
        encounter_difficulty = config[sectionName]['encounter_difficulty'] 
        match = re.match('\-?\d+', encounter_difficulty)
        encounter_difficulty = int(match.group(0)) if match else 0
        for (key, item) in config[sectionName].items():
            match = re.search("(\d+)_(\d+)", key)
            if match: 
                x, y = tuple(map(int, match.group(1, 2)))
                x += tx
                y += ty
                if (x > num_cols-1): continue
                if (y > num_rows-1): continue
                info = item.split(',')
                #print("%d - %d: %s" % (x, y, info[5]))
                tiles[x][y] = {'terrain': info[0], 
                    'fill': info[1], 
                    'morning_chance': info[2], 
                    'afternoon_chance': info[3], 
                    'night_chance': info[4], 
                    'type': info[5],
                    'difficulty': encounter_difficulty,
                    'origin': '['+sectionName+'].'+key}
        if (tileNum % num_horiz == num_horiz - 1):
            tx = 0
            ty += TILE_HEIGHT
        else:
            tx += TILE_WIDTH
    elif re.search("Encounter Table \d+", sectionName):
        # parse encounter table
        table = {
            'maps': list(map(str.strip, config[sectionName]['maps'].split(','))), 
            'encs': {}
            }
        for (key, item) in config[sectionName].items():
            if re.search("enc_\d+", key):
                table['encs'][key] = parse_enc(item)
                
        enc_tables[config[sectionName]["lookup_name"]] = table
    elif re.search("Encounter\:\s+(\w+)", sectionName):
        # parse encounter type
        # print(sectionName)
        table = {
            'position': config[sectionName]['position'] if 'position' in config[sectionName].keys() else '', 
            'types': {}
            }
        for (key, item) in config[sectionName].items():
            if re.search("type_\d+", key):
                table['types'][key] = parse_critter_type(item)
                
        enc_types[re.search("Encounter\:\s+(\w+)", sectionName).group(1)] = table

result = {'enc_types': enc_types, 'enc_tables': enc_tables, 'num_cols': num_cols, 'num_rows': num_rows, 'tiles': tiles}

print("Found %d encounter definitions." % len(enc_types))
print("Found %d encounter tables." % len(enc_tables))

file = open(outFilename, "w")
json.dump(result, file, indent = None, sort_keys = True)
file.close()

print(outFilename + " was written.")

# with io.open(files=('worldmap.txt')) as f:
    # for line in f:
        # if (line[0] == "["):
            # sectionName = line[1:line.find("]")]
            # # if (re.search(sectionName[:4]) == 'Tile'):
                
            # print(sectionName)

