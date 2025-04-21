from typing import List
import requests
import json

from polycobra_backend.constants.endpoints import GAMMA_URL


def construct_url(slug: str):
    return f'{GAMMA_URL}/events?tag_slug={slug}&closed=false&order=startDate&ascending=false'


def event_slugs_by_tag_slug(slug: str) -> List[str]:
    data_list = requests.get(construct_url(slug)).json()

    event_slugs: List[str] = []
    for event_object in data_list:
        event_slugs.append(event_object['slug'])

    return event_slugs


if __name__ == '__main__':
    print(json.dumps(event_slugs_by_tag_slug('ripple'), indent=2))
