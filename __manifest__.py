# -*- coding: utf-8 -*-

{
    'name': 'POS Managed Credit Sale',
    'version': '0.1.1',
    'author': 'Benlever Pvt Ltd',
    'website': 'https://www.benlever.com',
    'category': 'Sales/Point of Sale',
    'sequence': 6,
    'summary': 'Manage credit sales on POS',
    'description': """

This module restricts credit sales beyond the approved limit.
""",
    'depends': ['point_of_sale', 'sale_management', 'pos_sale'],
    'data': [
    ],
    'installable': True,
    'assets': {
        'point_of_sale.assets': [
            'pos_managed_credit_sale/static/src/js/**/*'
        ],
    },
    'license': 'LGPL-3',
}
