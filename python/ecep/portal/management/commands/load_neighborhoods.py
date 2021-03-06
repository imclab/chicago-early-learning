# Copyright (c) 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.core.management.base import BaseCommand
from django.contrib.gis.utils import LayerMapping
from django.db import IntegrityError

from portal.models import Neighborhood
from portal.management.commands import export_topojson

class Command(BaseCommand):
    """
    Import shapefile of communities into database
    Communities are simplified versions of neighborhoods and have the same properties

    Data Source: https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Community-Areas/i65m-w5fr
    """

    args = '<none>'
    help = """This management command will load the communities shapefile in the ecep/data/ directory
    of this project using the portal.Neighborhood models of this django application"""

    def handle(self, *args, **options):
        """
        Load community shapefile using LayerMapping; automatically checks projection,
        if necessary transforms to WSG 1984
        """
        neighborhood_mapping = {
            'boundary': 'MULTIPOLYGON',
            'primary_name': 'COMMUNITY',
            'secondary_name': 'AREA_NUM_1',
        }

        path_to_shp = 'data/chicago_communities/CommAreas.shp'
        lm = LayerMapping(Neighborhood, path_to_shp, neighborhood_mapping)
        self.check_neighborhood_table()
        lm.save(strict=True)

        self.stdout.write('Successfully loaded %s communities from %s layer(s) into database\n'
                          % (len(lm.ds[0]), lm.ds.layer_count))

        # Change case of imported name strings from UPPER to Caps Case
        communities = Neighborhood.objects.all()
        for community in communities:
            names = [name.capitalize() for name in community.primary_name.split()]
            primary_name_caps = " ".join(names) 
            self.stdout.write('Changing name %s ==> %s\n' % (community.primary_name, primary_name_caps))
            community.primary_name = primary_name_caps
            community.save()

        # Export topojson
        export_topojson.Command().handle()

    def check_neighborhood_table(self):
        """Checks whether or not neighborhoods are already loaded, raises an error if
        the neighborhood table already has data. This prevents user from just duplicate
        copies of the neighborhood data.

        TO DO: Add a flag that can override this function.
        """
        n_count = Neighborhood.objects.filter().count()
        if n_count > 0:
            raise IntegrityError('Neighborhood table already has data in it; please remove this data to proceed')

