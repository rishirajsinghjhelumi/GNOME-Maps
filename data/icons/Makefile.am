NULL =

public_icons_themes =				\
	hicolor					\
	$(NULL)

poi_icons = \
	scalable_places_poi-airport.svg \
	scalable_places_poi-building.svg \
	scalable_places_poi-bus-stop.svg \
	scalable_places_poi-car.svg \
	scalable_places_poi-marker.svg \
	scalable_places_poi-railway-station.svg \
	scalable_places_poi-town.svg \
	scalable_places_poi-school.svg \
	scalable_places_poi-place-of-worship.svg \
	scalable_places_poi-restaurant.svg \
	scalable_places_poi-bar.svg \
	scalable_places_poi-bank.svg \
	scalable_places_poi-fast-food.svg \
	scalable_places_poi-hospital.svg \
	scalable_places_poi-ferry.svg \
	scalable_places_poi-lodging.svg \
	scalable_places_poi-library.svg \
	scalable_places_poi-park.svg \
	scalable_places_poi-police.svg \
	scalable_places_poi-theatre.svg \
	scalable_places_poi-museum.svg \
	scalable_places_poi-circle-red.svg

public_icons =					\
	hicolor_apps_16x16_gnome-maps.png	\
	hicolor_apps_22x22_gnome-maps.png	\
	hicolor_apps_24x24_gnome-maps.png	\
	hicolor_apps_32x32_gnome-maps.png	\
	hicolor_apps_48x48_gnome-maps.png	\
	hicolor_apps_256x256_gnome-maps.png	\
	$(NULL)

imagesdir = $(datadir)/gnome-maps/pixmaps
images_DATA =                                   \
	bubble.svg				\
	pin.svg					\
        $(NULL)

noinst_DATA =					\
	gnome-maps.svg				\
	$(NULL)

EXTRA_DIST =					\
	$(public_icons)				\
	$(images_DATA)				\
	$(poi-icons)				\
	gnome-maps.svg				\
	$(NULL)

###############################################################################

gtk_update_icon_cache = gtk-update-icon-cache -f -t

update-icon-cache:
	@-if test -z "$(DESTDIR)"; then \
		echo "Updating Gtk icon cache."; \
		for theme in $(public_icons_themes); do \
			$(gtk_update_icon_cache) $(datadir)/icons/$$theme; \
		done; \
	else \
		echo "*** Icon cache not updated.  After (un)install, run this:"; \
		for theme in $(public_icons_themes); do \
			echo "***   $(gtk_update_icon_cache) $(datadir)/icons/$$theme"; \
		done; \
	fi

install-icons:
	for icon in $(public_icons); do \
		THEME=`echo $$icon | cut -d_ -f1`; \
		CONTEXT=`echo $$icon | cut -d_ -f2`; \
		SIZE=`echo $$icon | cut -d_ -f3`; \
		ICONFILE=`echo $$icon | cut -d_ -f4`; \
		mkdir -p $(DESTDIR)$(datadir)/icons/$$THEME/$$SIZE/$$CONTEXT; \
		$(INSTALL_DATA) $(srcdir)/$$icon $(DESTDIR)$(datadir)/icons/$$THEME/$$SIZE/$$CONTEXT/$$ICONFILE; \
	done

	for icon in $(poi_icons); do \
		ICON=`echo $$icon | sed -e 's:_:/:g'`; \
		ICONDIR=`dirname $$ICON`; \
		mkdir -p $(DESTDIR)$(datadir)/icons/gnome/$$ICONDIR; \
		echo INSTALL $(DESTDIR)$(datadir)/icons/gnome/$$ICON; \
		$(INSTALL_DATA) $(srcdir)/maki/$$icon $(DESTDIR)$(datadir)/icons/gnome/$$ICON; \
	done;

uninstall-icons:
	-for icon in $(public_icons); do \
		THEME=`echo $$icon | cut -d_ -f1`; \
		CONTEXT=`echo $$icon | cut -d_ -f2`; \
		SIZE=`echo $$icon | cut -d_ -f3`; \
		ICONFILE=`echo $$icon | cut -d_ -f4`; \
		rm -f $(DESTDIR)$(datadir)/icons/$$THEME/$$SIZE/$$CONTEXT/$$ICONFILE; \
	done

install-data-local: install-icons
install-data-hook: update-icon-cache

uninstall-local: uninstall-icons
uninstall-hook: update-icon-cache

-include $(top_srcdir)/git.mk
